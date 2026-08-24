"""
aqi_predictor.py — ML-based 24-hour AQI inference script for NirVayu.

This script is spawned as a subprocess by the Node.js Express server on every
prediction request. It must run fast and be robust to all failure modes.

Usage (standalone test):
    py server/aqi_predictor.py '{"pm10": 120, "o3": 30, "no2": 15, "so2": 10, "co": 8, "timestamp": "2026-08-25T00:00:00"}'

Output contract (STRICT):
    stdout — exactly one line: a JSON array of 24 integers, e.g. [142, 145, ...]
    stderr — any diagnostic/error messages
    exit code — always 0 (even on error, a fallback array is printed to stdout)

Input JSON keys:
    pm10       : float — current PM10 reading (µg/m³)
    o3         : float — current O3 reading
    no2        : float — current NO2 reading
    so2        : float — current SO2 reading
    co         : float — current CO reading
    timestamp  : str   — ISO 8601 datetime string for the current hour
"""

import os
import sys
import json
import math
import traceback
from datetime import datetime, timedelta

# ---------------------------------------------------------------------------
# Safe defaults used in the error-fallback path
# ---------------------------------------------------------------------------
FALLBACK_DEFAULT_VALUE = 100
FALLBACK_ARRAY = [FALLBACK_DEFAULT_VALUE] * 24


def _print_fallback_and_exit(reason: str, exception: Exception = None) -> None:
    """Print a safe 24-integer fallback array to stdout and exit 0."""
    print(f"[aqi_predictor] FALLBACK triggered: {reason}", file=sys.stderr, flush=True)
    if exception:
        print(f"[aqi_predictor] Exception: {traceback.format_exc()}", file=sys.stderr, flush=True)
    print(json.dumps(FALLBACK_ARRAY), flush=True)
    sys.exit(0)


# ---------------------------------------------------------------------------
# 1. Load the trained model at script startup.
#    Resolve path relative to this script's own location so it works
#    regardless of which directory Node.js invokes it from.
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "models", "aqi_model.pkl")

try:
    import joblib
    import numpy as np

    if not os.path.exists(MODEL_PATH):
        _print_fallback_and_exit(f"Model file not found: {MODEL_PATH}")

    model_bundle = joblib.load(MODEL_PATH)
    MODEL = model_bundle["model"]
    FEATURE_COLS = model_bundle["features"]
    # Expected: ["pm10", "o3", "no2", "so2", "co", "day_of_year", "month", "day_of_week"]

except Exception as e:
    _print_fallback_and_exit("Failed to load model bundle", e)
    # _print_fallback_and_exit calls sys.exit(0), so code below is unreachable on error.
    # These assignments suppress linter "possibly unbound" warnings:
    MODEL = None  # type: ignore
    FEATURE_COLS = []  # type: ignore
    np = None  # type: ignore


# ---------------------------------------------------------------------------
# 2. Diurnal variation helper.
#    Applies a small, deterministic, sinusoidal adjustment to gas readings
#    to produce a more realistic-looking 24-hour curve. The adjustment is
#    based on typical Delhi traffic/inversion patterns:
#      - Peak pollution in early morning (rush hour ~8am) & evening (~7pm)
#      - Trough in mid-afternoon (~3pm) when convective mixing is strongest
# ---------------------------------------------------------------------------
def _diurnal_factor(hour_0_23: int) -> float:
    """
    Returns a multiplier in roughly [0.82, 1.18] for the given hour.
    hour_0_23: 0 = midnight, 6 = 6am, 12 = noon, 18 = 6pm, etc.
    """
    # Two-peak diurnal: morning rush (peak at h=8) + evening rush (peak at h=19)
    # Expressed as sum of two cosines, normalised so the overall range ≈ ±18%.
    morning = math.cos(2 * math.pi * (hour_0_23 - 8) / 24)
    evening = math.cos(2 * math.pi * (hour_0_23 - 19) / 24)
    combined = (morning + evening) / 2.0          # in [-1, 1]
    return 1.0 + 0.18 * combined                  # in [0.82, 1.18]


# ---------------------------------------------------------------------------
# 3. Build a batch of 24 feature rows — one per upcoming hour.
#    Each row advances the date features by 1 hour from the base timestamp.
#    Gas-column features are held roughly constant but scaled by the diurnal
#    factor so each model call uses a slightly different (yet explainable) input.
# ---------------------------------------------------------------------------
def _build_feature_batch(base_ts: datetime, gas_values: dict) -> "np.ndarray":
    """
    Returns an (24, n_features) numpy array ready for model.predict().
    gas_values: dict with keys matching ['pm10', 'o3', 'no2', 'so2', 'co']
    """
    rows = []
    for h_offset in range(24):
        ts = base_ts + timedelta(hours=h_offset)
        factor = _diurnal_factor(ts.hour)

        row = {}
        # Gas features — apply diurnal scaling
        for gas in ["pm10", "o3", "no2", "so2", "co"]:
            raw = gas_values.get(gas, 0.0) or 0.0
            row[gas] = max(0.0, float(raw) * factor)

        # Date-derived features — advance per hour
        row["day_of_year"] = ts.timetuple().tm_yday
        row["month"] = ts.month
        row["day_of_week"] = ts.weekday()  # 0=Monday … 6=Sunday

        rows.append([row[col] for col in FEATURE_COLS])

    return np.array(rows, dtype=np.float64)


# ---------------------------------------------------------------------------
# 4. Main inference logic — runs when invoked from command line by Node.
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # -----------------------------------------------------------------------
    # 4a. Parse input JSON from sys.argv[1]
    # -----------------------------------------------------------------------
    if len(sys.argv) < 2:
        _print_fallback_and_exit("No input argument provided (expected JSON string as argv[1])")

    try:
        input_data = json.loads(sys.argv[1])
    except Exception as e:
        _print_fallback_and_exit("Failed to parse input JSON", e)

    # -----------------------------------------------------------------------
    # 4b. Extract and validate inputs
    # -----------------------------------------------------------------------
    try:
        # Timestamp — parse ISO string (or fall back to now)
        ts_str = input_data.get("timestamp")
        if ts_str:
            try:
                # Handle both 'Z' suffix and offset-aware strings
                base_ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                # Strip timezone info for feature engineering (we only care about local hour)
                base_ts = base_ts.replace(tzinfo=None)
            except ValueError:
                base_ts = datetime.now()
                print(f"[aqi_predictor] Warning: could not parse timestamp '{ts_str}', using now()", file=sys.stderr)
        else:
            base_ts = datetime.now()

        # Gas readings
        gas_values = {
            "pm10": float(input_data.get("pm10") or 80.0),
            "o3":   float(input_data.get("o3")   or 25.0),
            "no2":  float(input_data.get("no2")  or 20.0),
            "so2":  float(input_data.get("so2")  or 10.0),
            "co":   float(input_data.get("co")   or 8.0),
        }

    except Exception as e:
        _print_fallback_and_exit("Failed to extract input values", e)

    # -----------------------------------------------------------------------
    # 4c. Build feature batch and run model predictions
    # -----------------------------------------------------------------------
    try:
        feature_batch = _build_feature_batch(base_ts, gas_values)
        raw_predictions = MODEL.predict(feature_batch)  # shape: (24,)

        # Round to integers; clamp to non-negative (AQI / pm25-proxy can't be negative)
        hourly = [max(0, int(round(float(v)))) for v in raw_predictions]

        if len(hourly) != 24:
            _print_fallback_and_exit(f"Model returned {len(hourly)} values instead of 24")

    except Exception as e:
        _print_fallback_and_exit("Model prediction failed", e)

    # -----------------------------------------------------------------------
    # 4d. Output — ONLY this line goes to stdout.
    #     Node.js will parse it directly as JSON.
    # -----------------------------------------------------------------------
    print(json.dumps(hourly), flush=True)
    sys.exit(0)
