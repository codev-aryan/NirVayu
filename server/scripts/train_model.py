"""
train_model.py — Offline training script for NirVayu 24-hour AQI predictor.

Run once as a developer task to produce server/models/aqi_model.pkl.
Usage (from any directory):
    py server/scripts/train_model.py
    python server/scripts/train_model.py
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

# ---------------------------------------------------------------------------
# 1. Resolve paths relative to this script's location so the script works
#    regardless of the current working directory it is invoked from.
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
# server/ is the parent of scripts/
SERVER_DIR = SCRIPT_DIR.parent
DATA_PATH = SERVER_DIR / "data" / "merged_19_csv_files.csv"
MODELS_DIR = SERVER_DIR / "models"
MODEL_PATH = MODELS_DIR / "aqi_model.pkl"

# ---------------------------------------------------------------------------
# 2. Load CSV
# ---------------------------------------------------------------------------
print(f"[train] Loading data from: {DATA_PATH}", flush=True)
if not DATA_PATH.exists():
    print(f"[train] ERROR: CSV not found at {DATA_PATH}", file=sys.stderr)
    sys.exit(1)

df = pd.read_csv(DATA_PATH, low_memory=False)

# ---------------------------------------------------------------------------
# 3. Clean column names — strip leading/trailing whitespace
#    Raw columns include leading spaces: ' pm25', ' pm10', etc.
# ---------------------------------------------------------------------------
df.columns = df.columns.str.strip()
# After this: date, pm25, pm10, o3, no2, so2, co, source_file, ...

# ---------------------------------------------------------------------------
# 4. Drop junk metadata rows (extra safeguard)
# ---------------------------------------------------------------------------
JUNK_SOURCES = {"station_metadata", "download_results"}
df = df[~df["source_file"].isin(JUNK_SOURCES)].copy()
print(f"[train] Rows after dropping metadata junk: {len(df)}", flush=True)

# ---------------------------------------------------------------------------
# 5. Drop rows where date is null/empty
# ---------------------------------------------------------------------------
df = df[df["date"].notna() & (df["date"].astype(str).str.strip() != "")]
print(f"[train] Rows after dropping empty dates: {len(df)}", flush=True)

# ---------------------------------------------------------------------------
# 6. Coerce all pollutant columns to numeric
#    Many cells are empty strings or non-numeric strings — pd.to_numeric with
#    errors='coerce' converts those to NaN safely; a plain .astype(float) crashes.
# ---------------------------------------------------------------------------
POLLUTANT_COLS = ["pm25", "pm10", "o3", "no2", "so2", "co"]
for col in POLLUTANT_COLS:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# ---------------------------------------------------------------------------
# 7. Drop rows where the TARGET (pm25) is still null after coercion
# ---------------------------------------------------------------------------
before = len(df)
df = df[df["pm25"].notna()].copy()
print(f"[train] Dropped {before - len(df)} rows with null pm25. Remaining: {len(df)}", flush=True)

# ---------------------------------------------------------------------------
# 8. Parse date column (format: YYYY/M/D, e.g. 2026/4/1)
# ---------------------------------------------------------------------------
df["date_parsed"] = pd.to_datetime(df["date"], format="%Y/%m/%d", errors="coerce")
before = len(df)
df = df[df["date_parsed"].notna()].copy()
print(f"[train] Dropped {before - len(df)} rows with unparseable dates. Remaining: {len(df)}", flush=True)

# ---------------------------------------------------------------------------
# 9. Derive date-based features
# ---------------------------------------------------------------------------
df["day_of_year"] = df["date_parsed"].dt.day_of_year
df["month"] = df["date_parsed"].dt.month
df["day_of_week"] = df["date_parsed"].dt.day_of_week  # 0=Monday … 6=Sunday

# ---------------------------------------------------------------------------
# 10. Feature columns and target
#     gas features: pm10, o3, no2, so2, co  (pm25 is the TARGET — do NOT include)
#     date features: day_of_year, month, day_of_week
# ---------------------------------------------------------------------------
FEATURE_COLS = ["pm10", "o3", "no2", "so2", "co", "day_of_year", "month", "day_of_week"]
TARGET_COL = "pm25"

# ---------------------------------------------------------------------------
# 11. Median-impute remaining nulls in feature columns
#     (some gas columns like so2 have more missing values)
# ---------------------------------------------------------------------------
for col in ["pm10", "o3", "no2", "so2", "co"]:
    median_val = df[col].median()
    null_count = df[col].isna().sum()
    if null_count > 0:
        df[col] = df[col].fillna(median_val)
        print(f"[train] Imputed {null_count} nulls in '{col}' with median={median_val:.2f}", flush=True)

X = df[FEATURE_COLS].values
y = df[TARGET_COL].values

print(f"[train] Final training dataset: {X.shape[0]} samples, {X.shape[1]} features", flush=True)
print(f"[train] Features: {FEATURE_COLS}", flush=True)
print(f"[train] Target (pm25): min={y.min():.1f}, max={y.max():.1f}, mean={y.mean():.1f}", flush=True)

# ---------------------------------------------------------------------------
# 12. Train/test split (80/20, fixed random_state for reproducibility)
# ---------------------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)
print(f"[train] Train size: {len(X_train)}, Test size: {len(X_test)}", flush=True)

# ---------------------------------------------------------------------------
# 13. Train RandomForestRegressor
# ---------------------------------------------------------------------------
print("[train] Training RandomForestRegressor (n_estimators=100)...", flush=True)
model = RandomForestRegressor(
    n_estimators=35,
    max_depth=10,
    min_samples_leaf=4,
    n_jobs=-1,
    random_state=42,
    max_features="sqrt"
)
model.fit(X_train, y_train)
print("[train] Training complete.", flush=True)

# ---------------------------------------------------------------------------
# 14. Evaluate on test set (developer sanity check — printed to stdout)
# ---------------------------------------------------------------------------
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
print(f"\n[train] === Model Evaluation ===", flush=True)
print(f"[train]   MAE  (Mean Absolute Error): {mae:.2f} µg/m³", flush=True)
print(f"[train]   R²   (Coefficient of Det.): {r2:.4f}", flush=True)
print(f"[train] ==============================\n", flush=True)

# ---------------------------------------------------------------------------
# 15. Save model + feature column names to server/models/aqi_model.pkl
#     Stored as a single dict so the inference script always uses the exact
#     same feature order as training.
# ---------------------------------------------------------------------------
MODELS_DIR.mkdir(parents=True, exist_ok=True)

model_bundle = {
    "model": model,
    "features": FEATURE_COLS,
}
joblib.dump(model_bundle, MODEL_PATH)
print(f"[train] Model saved to: {MODEL_PATH}", flush=True)
print("[train] Done. Run server/aqi_predictor.py to test inference.", flush=True)
