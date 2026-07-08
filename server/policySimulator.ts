import { type Ward } from "@shared/schema";

export interface SimulationInputs {
  dustReduction: number;
  trafficReduction: number;
  constructionControl: number;
}

export interface SimulationResult {
  currentAqi: number;
  projectedAqi: number;
  absoluteImprovement: number;
  percentageImprovement: number;
  breakdown: {
    dust: number;
    traffic: number;
    construction: number;
  };
  summary: string;
}

// Model Weights
const W_DUST = 0.32;
const W_TRAFFIC = 0.45;
const W_CONSTRUCTION = 0.18;

export function simulatePolicy(ward: Ward, inputs: SimulationInputs): SimulationResult {
  // 1. Clamp all inputs between 0–100
  const D = Math.max(0, Math.min(100, inputs.dustReduction));
  const T = Math.max(0, Math.min(100, inputs.trafficReduction));
  const C = Math.max(0, Math.min(100, inputs.constructionControl));
  
  const currentPM25 = ward.aqi; // Using AQI as proxy for PM2.5 as per existing system design
  
  // 2. Deterministic policy-impact equation
  // PM25_after = currentPM25 * (1 - w_dust * (dustReduction / 100) - w_traffic * (trafficReduction / 100) - w_construction * (constructionControl / 100))
  const reductionFactor = (W_DUST * (D / 100)) + (W_TRAFFIC * (T / 100)) + (W_CONSTRUCTION * (C / 100));
  const pm25After = currentPM25 * (1 - reductionFactor);
  
  const projectedAqi = Math.max(0, Math.round(pm25After));
  const absoluteImprovement = currentPM25 - projectedAqi;
  const percentageImprovement = currentPM25 > 0 ? (absoluteImprovement / currentPM25) * 100 : 0;
  
  // Contribution breakdown (absolute points)
  const breakdown = {
    dust: Math.round(currentPM25 * W_DUST * (D / 100)),
    traffic: Math.round(currentPM25 * W_TRAFFIC * (T / 100)),
    construction: Math.round(currentPM25 * W_CONSTRUCTION * (C / 100))
  };
  
  const dominant = Object.entries(breakdown).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const summary = absoluteImprovement > 0 
    ? `Implementing these policies could reduce AQI by ${Math.round(absoluteImprovement)} points. ${dominant.charAt(0).toUpperCase() + dominant.slice(1)} control shows the highest impact.`
    : "No significant improvement projected with current settings.";

  return {
    currentAqi: currentPM25,
    projectedAqi,
    absoluteImprovement,
    percentageImprovement,
    breakdown,
    summary
  };
}
