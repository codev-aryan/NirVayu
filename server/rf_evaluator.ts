import fs from "fs";
import path from "path";

interface TreeData {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  value: number[];
}

interface ModelData {
  features: string[];
  trees: TreeData[];
}

let modelData: ModelData | null = null;

function loadModel(): ModelData | null {
  if (modelData) return modelData;
  try {
    const jsonPath = path.join(process.cwd(), "server", "models", "rf_trees.json");
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, "utf-8");
      modelData = JSON.parse(content);
      return modelData;
    }
  } catch (err) {
    console.error("[RF Evaluator] Failed to load rf_trees.json:", err);
  }
  return null;
}

function evaluateTree(tree: TreeData, featureValues: number[]): number {
  let node = 0;
  while (tree.children_left[node] !== -1) {
    const featIdx = tree.feature[node];
    const val = featureValues[featIdx] ?? 0;
    if (val <= tree.threshold[node]) {
      node = tree.children_left[node];
    } else {
      node = tree.children_right[node];
    }
  }
  return tree.value[node];
}

export function predictWithRandomForest(input: {
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  timestamp?: string;
}): number[] | null {
  const model = loadModel();
  if (!model) return null;

  const now = input.timestamp ? new Date(input.timestamp) : new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const month = now.getMonth() + 1;
  const dayOfWeek = now.getDay();

  const hourlyPredictions: number[] = [];

  for (let h = 0; h < 24; h++) {
    // Diurnal variation multiplier for realistic 24h curve matching traffic & solar inversion
    const morning = Math.cos((2 * Math.PI * (h - 8)) / 24);
    const evening = Math.cos((2 * Math.PI * (h - 19)) / 24);
    const diurnalFactor = 1.0 + 0.18 * ((morning + evening) / 2.0);

    const featureValues = [
      input.pm10 * diurnalFactor,
      input.o3 * diurnalFactor,
      input.no2 * diurnalFactor,
      input.so2 * diurnalFactor,
      input.co * diurnalFactor,
      dayOfYear,
      month,
      dayOfWeek
    ];

    let sum = 0;
    for (const tree of model.trees) {
      sum += evaluateTree(tree, featureValues);
    }
    const avg = sum / model.trees.length;
    hourlyPredictions.push(Math.max(0, Math.round(avg)));
  }

  return hourlyPredictions;
}
