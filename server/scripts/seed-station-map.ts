/**
 * seed-station-map.ts
 * 
 * Run once to pre-populate server/data/station-map.json
 * Maps each Delhi ward to the nearest active AQICN monitoring station.
 * 
 * Usage: npx tsx server/scripts/seed-station-map.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

// Known active AQICN Delhi stations (from WAQI API search)
// uid = station ID used in /feed/@{uid}/ endpoint
const DELHI_STATIONS = [
  { uid: 10112, name: "PGDAV College, Sriniwaspuri",    lat: 28.566827, lng: 77.251418 },
  { uid: 2553,  name: "Anand Vihar",                    lat: 28.6508,   lng: 77.3152   },
  { uid: 10113, name: "ITI Jahangirpuri",               lat: 28.733016, lng: 77.17197  },
  { uid: 2554,  name: "Mandir Marg",                    lat: 28.6341,   lng: 77.2005   },
  { uid: 10114, name: "Wazirpur (DITE)",                lat: 28.700505, lng: 77.165603 },
  { uid: 2556,  name: "R.K. Puram",                    lat: 28.5648,   lng: 77.1744   },
  { uid: 10124, name: "Pusa",                           lat: 28.636997, lng: 77.172248 },
  { uid: 10115, name: "Satyawati College",              lat: 28.69572,  lng: 77.181295 },
  { uid: 10705, name: "Jawaharlal Nehru Stadium",       lat: 28.582846, lng: 77.234366 },
  { uid: 10704, name: "Mother Dairy Patparganj",        lat: 28.620171, lng: 77.287705 },
  { uid: 10121, name: "Sonia Vihar",                   lat: 28.710066, lng: 77.24622  },
  { uid: 10111, name: "Major Dhyan Chand Stadium",      lat: 28.612498, lng: 77.237388 },
  { uid: 10118, name: "ITI Shahdara, Jhilmil",         lat: 28.672114, lng: 77.313832 },
  { uid: 11267, name: "Pooth Khurd, Bawana",           lat: 28.7757959,lng: 77.0462514},
  { uid: 2555,  name: "Punjabi Bagh",                  lat: 28.6683,   lng: 77.1167   },
  { uid: 10707, name: "Sri Aurobindo Marg",            lat: 28.528344, lng: 77.189304 },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestStation(lat: number, lng: number): number {
  let best = DELHI_STATIONS[0];
  let bestDist = Infinity;
  for (const s of DELHI_STATIONS) {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best.uid;
}

// Find GeoJSON
const geoPaths = [
  path.resolve(process.cwd(), "attached_assets/Delhi_Wards_1768070860005.geojson"),
  path.resolve(_dirname, "../../attached_assets/Delhi_Wards_1768070860005.geojson"),
];

let geojsonPath = "";
for (const p of geoPaths) {
  if (fs.existsSync(p)) { geojsonPath = p; break; }
}

if (!geojsonPath) {
  console.error("GeoJSON not found");
  process.exit(1);
}

const geojson = JSON.parse(fs.readFileSync(geojsonPath, "utf8"));
const stationMap: Record<string, number> = {};

geojson.features.forEach((feature: any) => {
  const wardName: string = feature.properties.Ward_Name ?? "Unknown";
  const center = turf.centroid(feature);
  const [lng, lat] = center.geometry.coordinates;
  const uid = nearestStation(lat, lng);
  stationMap[wardName] = uid;
});

const outPath = path.resolve(process.cwd(), "server/data/station-map.json");
fs.writeFileSync(outPath, JSON.stringify(stationMap, null, 2), "utf8");
console.log(`✅ station-map.json written with ${Object.keys(stationMap).length} ward mappings to ${outPath}`);

// Summary
const counts: Record<number, number> = {};
for (const uid of Object.values(stationMap)) counts[uid] = (counts[uid] || 0) + 1;
for (const [uid, count] of Object.entries(counts)) {
  const s = DELHI_STATIONS.find(s => s.uid === Number(uid));
  console.log(`  Station @${uid} (${s?.name}): ${count} wards`);
}
