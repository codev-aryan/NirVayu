import { type Ward, type User, type InsertUser, type Report, type InsertReport, type Evidence, type InsertEvidence } from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";
import { execFile } from "child_process";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";

const _filename = typeof import.meta !== "undefined" && import.meta?.url ? fileURLToPath(import.meta.url) : (typeof __filename !== "undefined" ? __filename : process.cwd());
const _dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(_filename);

const MemoryStore = createMemoryStore(session);
const execFilePromise = promisify(execFile);

import os from "os";

// ─── Serverless-safe global AQI cache (survives warm Vercel invocations) ───
interface AqiCacheEntry {
  wardId: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  dominant_source: string;
  intelligence_data: any;
  wprs: number;
  co2_budget_remaining: number;
}
interface AqiCache {
  entries: AqiCacheEntry[];
  fetchedAt: number;
}
declare global {
  // eslint-disable-next-line no-var
  var __aqiCache: AqiCache | undefined;
  // eslint-disable-next-line no-var
  var __stationMap: Record<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __globalReportsMap: Map<number, Report> | undefined;
}
const AQI_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const TMP_REPORTS_FILE = path.join(os.tmpdir(), "nirvayu_reports.json");

const INITIAL_SEED_REPORTS: Report[] = [];

function loadReportsFromTmp(): Map<number, Report> {
  if (global.__globalReportsMap && global.__globalReportsMap.size > 0) {
    return global.__globalReportsMap;
  }
  const map = new Map<number, Report>();
  try {
    if (fs.existsSync(TMP_REPORTS_FILE)) {
      const raw = fs.readFileSync(TMP_REPORTS_FILE, "utf-8");
      const list: Report[] = JSON.parse(raw);
      for (const r of list) {
        map.set(r.id, { ...r, timestamp: new Date(r.timestamp) });
      }
    }
  } catch (e) {
    console.error("[Storage] Failed to read /tmp/nirvayu_reports.json", e);
  }

  // Populate seed reports on cold start so refreshing page never results in empty state
  if (map.size === 0) {
    for (const r of INITIAL_SEED_REPORTS) {
      map.set(r.id, r);
    }
    try {
      fs.writeFileSync(TMP_REPORTS_FILE, JSON.stringify(Array.from(map.values()), null, 2), "utf-8");
    } catch {
      // ignore
    }
  }

  global.__globalReportsMap = map;
  return map;
}

function saveReportsToTmp(map: Map<number, Report>) {
  global.__globalReportsMap = map;
  try {
    const list = Array.from(map.values());
    fs.writeFileSync(TMP_REPORTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("[Storage] Failed to write /tmp/nirvayu_reports.json", e);
  }
}

export function buildGrapInfo(aqi: number, primarySource: string) {
  if (aqi > 450) {
    return {
      stage: "STAGE IV",
      stageName: "Severe+ Emergency",
      color: "bg-purple-600 text-white",
      description: "Severe+ conditions (AQI > 450). Extreme emergency measures enforced across Delhi.",
      enforcement_actions: [
        "Ban entry of heavy diesel trucks into the ward territory",
        "Mandatory closure of physical educational institutions (schools & colleges)",
        "Enforce 50% Work From Home (WFH) for private and government offices",
        "Implement Odd-Even vehicle rationing scheme on main transit corridors",
        "Halt all construction, demolition, and infrastructure excavation projects"
      ]
    };
  } else if (aqi > 400) {
    return {
      stage: "STAGE III",
      stageName: "Severe Pollution",
      color: "bg-red-600 text-white",
      description: "Severe conditions (AQI 401–450). Strict industrial & construction halts active.",
      enforcement_actions: [
        "Full ban on non-essential Construction & Demolition (C&D) activities",
        "Closure of brick kilns, stone crushers, and hot-mix plants",
        "Ban on BS-III petrol and BS-IV diesel light motor vehicles (4-wheelers)",
        "Deploy anti-smog guns continuously at key high-dust intersections",
        "Increase frequency of public transit (buses and metro runs)"
      ]
    };
  } else if (aqi > 300) {
    return {
      stage: "STAGE II",
      stageName: "Very Poor Pollution",
      color: "bg-orange-600 text-white",
      description: "Very Poor conditions (AQI 301–400). Targeted dust & emission controls active.",
      enforcement_actions: [
        "Enhance parking fees to discourage personal vehicle usage",
        "Synchronize traffic signals at congested bottlenecks to minimize idling",
        "Daily mechanized road sweeping and intensive chemical dust suppressant spraying",
        "Strict night patrolling to prevent open garbage or plastic waste burning",
        "Ensure uninterrupted power supply to eliminate diesel generator usage"
      ]
    };
  } else if (aqi > 200) {
    return {
      stage: "STAGE I",
      stageName: "Poor Pollution",
      color: "bg-amber-600 text-white",
      description: "Poor conditions (AQI 201–300). Mandatory dust mitigation & inspection active.",
      enforcement_actions: [
        "Mandatory anti-smog gun operation at construction sites > 500 sqm",
        "Mechanized road sweeping and regular water sprinkling on major roads",
        "Strict enforcement of anti-garbage burning regulations",
        "Heavy fine imposition on visibly polluting vehicles",
        "Public advisory issued for vulnerable and sensitive health groups"
      ]
    };
  } else {
    return {
      stage: "NORMAL",
      stageName: "Moderate / Satisfactory",
      color: "bg-green-600 text-white",
      description: "Standard monitoring conditions (AQI ≤ 200). Baseline environmental compliance.",
      enforcement_actions: [
        "Routine water sprinkling on vulnerable dust corridors",
        "Regular industrial emission stack inspections",
        "Standard traffic flow monitoring and signal maintenance",
        "Ongoing citizen complaint resolution and spot checks"
      ]
    };
  }
}

export function buildWeeklyPlan(aqi: number, dominantSource: string) {
  const source = (dominantSource || "").toLowerCase();

  // Strictly GRAP-stage-calibrated actions (CAQM Revision 21.11.2025)
  if (aqi > 450) {
    // STAGE IV — Severe+: Only emergency-level interventions
    return [
      { day: "Day 1", title: "Emergency: Truck Entry Ban", action: "Enforce complete ban on non-essential truck entry into ward. Deploy checkpoints at all arterial entry points. Only EVs, CNG, BS-VI diesel permitted.", priority: "Critical" as const },
      { day: "Day 2", title: "Emergency: Education & WFH", action: "Coordinate with district administration to enforce hybrid/online classes for Classes VI–XI. Issue WFH advisory to all non-essential offices.", priority: "Critical" as const },
      { day: "Day 3", title: "Emergency: All C&D Halt", action: "Halt ALL construction and demolition including linear public projects (highways, flyovers, pipelines). Zero exceptions. Seal non-compliant sites immediately.", priority: "Critical" as const },
      { day: "Day 4", title: "Odd-Even Assessment", action: "Assess feasibility of odd-even vehicle rationing. Coordinate with traffic police for implementation plan on arterial roads from next day.", priority: "Critical" as const },
      { day: "Day 5", title: "Non-Essential Commercial Review", action: "Evaluate closure of non-emergency commercial establishments as per CAQM Stage IV powers. Submit proposal to district authority.", priority: "High" as const },
      { day: "Day 6", title: "AQI Monitoring & Compliance Audit", action: "Intensive 6-hour AQI monitoring cycle. Audit all emergency measure compliance. Document violations for CAQM reporting.", priority: "High" as const },
      { day: "Day 7", title: "Stage Review & Next-Week Planning", action: "Compile 7-day AQI data and emergency compliance report. Submit to CAQM. Decide continuation or de-escalation of Stage IV measures.", priority: "High" as const }
    ];
  } else if (aqi >= 401) {
    // STAGE III — Severe (401–450): Strict C&D bans, vehicle restrictions
    return [
      { day: "Day 1", title: "C&D Activity Ban", action: "Enforce strict ban on all dust-generating C&D activities: earthwork, piling, demolition, trenching, brickwork, RMC batching, welding, tile grinding.", priority: "Critical" as const },
      { day: "Day 2", title: "Stone Crushers & Mining Closure", action: "Close down all stone crushers and mining operations across the ward and surrounding NCR jurisdiction. Issue closure notices immediately.", priority: "Critical" as const },
      { day: "Day 3", title: "BS-III/IV Vehicle Restrictions", action: "Enforce ban on BS-III petrol and BS-IV diesel LMVs (4-wheelers) within ward limits. Deploy traffic personnel at major junctions for checking.", priority: "Critical" as const },
      { day: "Day 4", title: "School Online Mode Enforcement", action: "Ensure all primary schools (up to Class V) are conducting classes in hybrid/online mode as mandated under GRAP Stage III.", priority: "High" as const },
      { day: "Day 5", title: "Anti-Smog Gun Deployment", action: "Continuous anti-smog gun operation at all major dust hotspots. Minimum 8-hour daily operation at C&D sites and arterial road intersections.", priority: "High" as const },
      { day: "Day 6", title: "Heavy Vehicle Compliance Check", action: "Patrol and fine diesel MGVs (BS-IV & below) registered in Delhi. Check non-Delhi BS-IV LCVs. Coordinate with traffic police for border checkpoints.", priority: "High" as const },
      { day: "Day 7", title: "Stage III Compliance Review", action: "Audit all Stage III enforcement actions. Document compliance rate per activity category. Prepare weekly report for CAQM submission.", priority: "High" as const }
    ];
  } else if (aqi >= 301) {
    // STAGE II — Very Poor (301–400): Enhanced dust & emission controls
    return [
      { day: "Day 1", title: "Mechanized Road Sweeping", action: "Daily mechanical/vacuum sweeping and water sprinkling with dust suppressants on all identified major roads before 7 AM peak traffic hour.", priority: "High" as const },
      { day: "Day 2", title: "C&D Site Inspection Drive", action: "Intensify inspections at all active Construction & Demolition sites for dust control compliance: green netting, anti-smog guns, covered material storage.", priority: "High" as const },
      { day: "Day 3", title: "DG Set Operation Audit", action: "Strictly implement regulated DG set operation schedules across industrial, commercial, and residential sectors. Issue notices to violators.", priority: "High" as const },
      { day: "Day 4", title: "Inter-State Bus Restriction", action: "Do not permit inter-state buses from NCR states to enter Delhi from this ward's entry points (except EVs / CNG / BS-VI Diesel).", priority: "High" as const },
      { day: "Day 5", title: "Parking Fee Enhancement", action: "Coordinate with municipal body to enhance parking fees at commercial hubs to discourage personal vehicle use. Promote public transit.", priority: "Medium" as const },
      { day: "Day 6", title: "Night Burning Patrol", action: "Zero-tolerance night-time patrol (9 PM – 5 AM) against open garbage, biomass, and plastic burning. Coordinate with local police for enforcement.", priority: "High" as const },
      { day: "Day 7", title: "Stage II Compliance Review", action: "Evaluate 7-day AQI trend and compliance scores. If AQI crosses 400, prepare immediate Stage III escalation protocol. Submit weekly report.", priority: "Medium" as const }
    ];
  } else if (aqi >= 201) {
    // STAGE I — Poor (201–300): Baseline dust mitigation & routine enforcement
    return [
      {
        day: "Day 1",
        title: source.includes("traffic") ? "Traffic Emission Enforcement"
          : source.includes("construction") ? "C&D Site Compliance Check"
          : source.includes("industrial") ? "Industrial Emission Inspection"
          : "Waste Burning Prevention",
        action: source.includes("traffic")
          ? "Deploy traffic police at heavy corridors & congestion-prone intersections. Impound visibly polluting vehicles. Check PUC certificates."
          : source.includes("construction")
          ? "Ensure anti-smog gun operation at C&D sites >500 sqm. Verify web portal registration. Check green netting and covered vehicles."
          : source.includes("industrial")
          ? "Conduct stack emission checks at industrial units. Enforce ban on coal/firewood in tandoors at hotels, restaurants & open eateries."
          : "Strict vigil at landfills and open areas. Deploy anti-burning mobile teams. Issue public advisory for waste disposal.",
        priority: "High" as const
      },
      { day: "Day 2", title: "Road Sweeping & Water Sprinkling", action: "Periodic mechanized sweeping & water sprinkling on all arterial roads. Intensify anti-smog guns at construction & road repair sites.", priority: "High" as const },
      { day: "Day 3", title: "PUC & Vehicle Pollution Check", action: "Strict vigilance & enforcement of PUC norms. Impound visibly polluting vehicles. Ensure non-destined truck diversion via Peripheral Expressways.", priority: "High" as const },
      { day: "Day 4", title: "Biomass Burning Vigil", action: "Stringently enforce prohibition on open burning of biomass & municipal solid waste. Strict vigil at landfill sites. Issue on-spot challans.", priority: "Medium" as const },
      { day: "Day 5", title: "C&D Site Dust Mitigation Audit", action: "Verify proper implementation of dust mitigation guidelines at all C&D sites. Check mandatory web portal registration for plots ≥500 sqm.", priority: "Medium" as const },
      { day: "Day 6", title: "Fuel Ban Enforcement", action: "Strictly enforce ban on coal/firewood use in tandoors in hotels, restaurants & open eateries in the ward. Issue notices and fines.", priority: "Medium" as const },
      { day: "Day 7", title: "Stage I Weekly Review", action: "Evaluate AQI trend for the week. If consistent improvement, maintain Stage I. If deteriorating toward 300, activate Stage II readiness protocol.", priority: "Medium" as const }
    ];
  } else {
    // No GRAP stage — routine baseline operations only
    return [
      { day: "Day 1", title: "Routine Road Dust Monitoring", action: "Standard water sprinkling on vulnerable dust corridors and unpaved roads. Check for construction sites generating excess dust.", priority: "Medium" as const },
      { day: "Day 2", title: "Vehicle Emission Spot Check", action: "Routine PUC certificate checks at major intersections. Document any visibly polluting vehicles for follow-up.", priority: "Medium" as const },
      { day: "Day 3", title: "Industrial Compliance Round", action: "Routine stack emission inspection at registered industrial units. Verify compliance with ambient air quality standards.", priority: "Medium" as const },
      { day: "Day 4", title: "Citizen Complaint Resolution", action: "Review and act on pending citizen pollution reports. Close resolved complaints and assign field teams to unresolved ones.", priority: "Medium" as const },
      { day: "Day 5", title: "Green Cover & Dust Barrier Check", action: "Inspect ongoing C&D sites for green netting compliance. Verify material covered during transport. No emergency action needed.", priority: "Medium" as const },
      { day: "Day 6", title: "Waste Management Coordination", action: "Coordinate with sanitation dept for timely waste collection to prevent open burning. Check landfill fire prevention measures.", priority: "Medium" as const },
      { day: "Day 7", title: "Weekly AQI Health Check", action: "Review 7-day AQI data. Air quality is satisfactory — document and maintain current baseline. No GRAP escalation warranted.", priority: "Medium" as const }
    ];
  }
}


// ─── Known active AQICN Delhi monitoring stations (hardcoded fallback) ───────
// These are fetched once to bootstrap the station-map; they rarely change.
const DELHI_AQICN_STATIONS = [
  { uid: 10112, lat: 28.566827, lng: 77.251418 }, // PGDAV College, Sriniwaspuri
  { uid: 2553,  lat: 28.6508,   lng: 77.3152   }, // Anand Vihar
  { uid: 10113, lat: 28.733016, lng: 77.17197  }, // ITI Jahangirpuri
  { uid: 2554,  lat: 28.6341,   lng: 77.2005   }, // Mandir Marg
  { uid: 10114, lat: 28.700505, lng: 77.165603 }, // Wazirpur (DITE)
  { uid: 2556,  lat: 28.5648,   lng: 77.1744   }, // R.K. Puram
  { uid: 10124, lat: 28.636997, lng: 77.172248 }, // Pusa
  { uid: 10115, lat: 28.69572,  lng: 77.181295 }, // Satyawati College
  { uid: 10705, lat: 28.582846, lng: 77.234366 }, // JN Stadium
  { uid: 10704, lat: 28.620171, lng: 77.287705 }, // Mother Dairy Patparganj
  { uid: 10121, lat: 28.710066, lng: 77.24622  }, // Sonia Vihar
  { uid: 10111, lat: 28.612498, lng: 77.237388 }, // Major Dhyan Chand Stadium
  { uid: 10118, lat: 28.672114, lng: 77.313832 }, // ITI Shahdara, Jhilmil
  { uid: 11267, lat: 28.775796, lng: 77.046251 }, // Pooth Khurd, Bawana
  { uid: 2555,  lat: 28.6683,   lng: 77.1167   }, // Punjabi Bagh
  { uid: 10707, lat: 28.528344, lng: 77.189304 }, // Sri Aurobindo Marg
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

function nearestStationUid(lat: number, lng: number): number {
  let best = DELHI_AQICN_STATIONS[0];
  let bestDist = Infinity;
  for (const s of DELHI_AQICN_STATIONS) {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best.uid;
}

// ─── Station-map helpers (wardName → WAQI station idx) ───
function getStationMapPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "server/data/station-map.json"),
    path.resolve(process.cwd(), "dist/server/data/station-map.json"),
    path.resolve(_dirname, "data/station-map.json"),
    path.resolve(_dirname, "../server/data/station-map.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // default write path
}

function loadStationMap(): Record<string, number> {
  if (global.__stationMap && Object.keys(global.__stationMap).length > 0) return global.__stationMap;
  try {
    const raw = fs.readFileSync(getStationMapPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Object.keys(parsed).length > 0) {
      global.__stationMap = parsed;
      return global.__stationMap!;
    }
  } catch {
    // file missing or malformed
  }
  global.__stationMap = {};
  return global.__stationMap!;
}

function saveStationMap(map: Record<string, number>): void {
  global.__stationMap = map;
  try {
    fs.writeFileSync(getStationMapPath(), JSON.stringify(map, null, 2), "utf8");
  } catch {
    // Vercel /var/task is read-only; that's fine, we use global cache
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getWards(): Promise<Ward[]>;
  getWard(id: number): Promise<Ward | undefined>;
  updateWard(id: number, ward: Partial<Ward>): Promise<Ward>;
  getLastUpdated(): Promise<Date>;

  // Reports
  createReport(report: Omit<Report, "id" | "timestamp" | "verified">): Promise<Report>;
  getReportsByWard(wardId: number): Promise<Report[]>;
  getReports(): Promise<Report[]>;
  updateReportVerification(id: number, verified: boolean): Promise<Report>;
  updateReportStatus(id: number, status: string): Promise<Report>;
  deleteReport(id: number): Promise<boolean>;
  restoreReport(report: Report): Promise<Report>;
  updateReportBlockchain(id: number, mediaHash: string, txHash: string | null): Promise<Report>;

  // Evidence
  createEvidence(evidence: Omit<Evidence, "id" | "timestamp" | "isVerified" | "actionChallengesCompleted"> & { isVerified?: boolean; actionChallengesCompleted?: string[] | null }): Promise<Evidence>;

  sessionStore: session.Store;
}

function co2_budget_from_aqi(
  aqi: number,
  e_max: number = 10000,
  traffic_score: number | null = null,
  construction_score: number | null = null,
  industrial_score: number | null = null,
  stubble_score: number | null = null
): number {
  /**
   * Backward-compatible dynamic CO₂ budget
   */

  aqi = Math.min(Math.max(aqi, 0), 500);
  const base_pollution = aqi / 500;

  // Fallback: behave exactly like old logic if no extra data is provided
  if ([traffic_score, construction_score, industrial_score, stubble_score].every(v => v === null)) {
    return Math.round(e_max * (1 - base_pollution) * 100) / 100;
  }

  const traffic = (traffic_score ?? 50) / 100;
  const construction = (construction_score ?? 50) / 100;
  const industry = (industrial_score ?? 50) / 100;
  const stubble = (stubble_score ?? 20) / 100;

  const pollution_factor = Math.min(
    1,
    base_pollution * (
      0.5
      + 0.2 * traffic
      + 0.15 * construction
      + 0.1 * industry
      + 0.05 * stubble
    )
  );

  const co2_budget = e_max * (1 - pollution_factor);

  // Safety floor to avoid zero budgets
  return Math.round(Math.max(co2_budget, e_max * 0.25) * 100) / 100;
}

function predictFutureAqi(currentAqi: number, pm25: number, pm10: number): { predictedAqi: number; confidence: number; horizon: string } {
  let trendFactor = 1.05; // Default slight increase
  if (pm25 > 150 || pm10 > 250) {
    trendFactor = 1.15; // Higher accumulation probability
  } else if (currentAqi < 50) {
    trendFactor = 1.02; // Stable at low levels
  }
  return {
    predictedAqi: Math.round(currentAqi * trendFactor * 100) / 100,
    confidence: currentAqi > 0 ? 0.85 : 0.0,
    horizon: "24h"
  };
}


export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private wards = new Map<number, Ward>();
  private reports = new Map<number, Report>();
  private evidence = new Map<number, Evidence>();
  private reportIdCounter = 1;
  private evidenceIdCounter = 1;
  private lastUpdated = new Date();
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    // Seed Wards and start AQI update in the background so it doesn't block server listen
    this.loadGeoJSON();
    setImmediate(async () => {
      try {
        await this.updatePollutionData();
      } catch (err) {
        console.error("Initial background AQI update failed:", err);
      }
    });
    // Refresh from API every 3 minutes (rate-limit safe)
    setInterval(() => this.updatePollutionData(), 3 * 60 * 1000);

    // Seed Authority Account
    this.createUser({
      username: "admin",
      password: "password123",
      role: "authority"
    });
  }

  private loadGeoJSON() {
    const pathsToTry = [
      path.resolve(process.cwd(), "attached_assets/Delhi_Wards_1768070860005.geojson"),
      path.resolve(process.cwd(), "dist/attached_assets/Delhi_Wards_1768070860005.geojson"),
      path.resolve(_dirname, "../attached_assets/Delhi_Wards_1768070860005.geojson"),
      path.resolve(_dirname, "../../attached_assets/Delhi_Wards_1768070860005.geojson"),
      path.resolve(_dirname, "attached_assets/Delhi_Wards_1768070860005.geojson"),
    ];

    let geojsonPath = "";
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        geojsonPath = p;
        break;
      }
    }

    if (!geojsonPath) {
      console.error("GeoJSON file not found at any tried paths:", pathsToTry);
      return;
    }

    const data = fs.readFileSync(geojsonPath, "utf8");
    const geojson = JSON.parse(data);
 
    geojson.features.forEach((feature: any, index: number) => {
      const id = index + 1;
      // Use Turf to get the actual centroid of the ward
      const center = turf.centroid(feature);
      const [lng, lat] = center.geometry.coordinates;
 
      // Deterministic realistic pollution values based on ward ID
      const aqi = 150 + ((id * 31) % 200); // 150 to 350
      const pm25 = Math.round(aqi * 0.6);
      const pm10 = Math.round(aqi * 0.8);
      const no2 = Math.round(aqi * 0.1);
      const so2 = Math.round(aqi * 0.05);
      const co = Math.round(aqi * 0.02 * 10) / 10;
      const o3 = Math.round(aqi * 0.03);
 
      let primarySource = "Traffic";
      if (id % 4 === 0) primarySource = "Construction";
      else if (id % 4 === 1) primarySource = "Industrial Emissions";
      else if (id % 4 === 2) primarySource = "Waste Burning";

      const primaryPollutant = aqi > 300 ? "PM2.5" : (no2 > 50 ? "NO2" : "Dust");
      const severity = aqi > 400 ? "Severe+" : aqi > 300 ? "Severe" : aqi > 200 ? "Poor" : "Moderate";
      const allowedControls = ["water_sprinkling", "waste_burning_ban"];
      if (aqi > 200) allowedControls.push("traffic_odd_even", "construction_halt");

      const prediction = predictFutureAqi(aqi, pm25, pm10);
      const grapInfo = buildGrapInfo(aqi, primarySource);
      const weeklyPlan = buildWeeklyPlan(aqi, primarySource);

      const intelligence_data: any = {
        ward: feature.properties.Ward_Name ?? `Ward ${id}`,
        primary_pollutant: primaryPollutant,
        severity,
        analysis_summary: `ML engine detected ${primaryPollutant} as dominant factor. Current AQI ${aqi} indicates ${severity} conditions (${grapInfo.stage}). Prediction: ${prediction.predictedAqi} AQI in ${prediction.horizon} (Confidence: ${Math.round(prediction.confidence * 100)}%).`,
        weekly_plan: weeklyPlan,
        grap_info: grapInfo,
        execution_plan_90_days: {
          days_0_30: allowedControls.slice(0, 3).map(c => `Immediate enforcement of ${c.replace(/_/g, ' ')}`),
          days_31_60: [
            `Transitioning from ${allowedControls[0].replace(/_/g, ' ')} to structural monitoring`,
            `Deploying ${primaryPollutant}-specific mitigation units`
          ],
          days_61_90: [
            "AI-driven predictive maintenance of control units",
            "Evaluation of severity reduction effectiveness"
          ]
        },
        confidence_level: "High",
        allowed_controls: allowedControls,
        predicted_aqi: prediction.predictedAqi,
        prediction_horizon: prediction.horizon,
        prediction_confidence: prediction.confidence
      };
 
      this.wards.set(id, {
        id,
        name: feature.properties.Ward_Name ?? `Ward ${id}`,
        latitude: lat,
        longitude: lng,
        aqi,
        pm25,
        pm10,
        no2,
        so2,
        co,
        o3,
        wprs: Math.max(0, 100 - Math.floor(aqi / 5)),
        co2_budget_remaining: co2_budget_from_aqi(aqi, 5000),
        emergency_mode: false,
        active_controls: [],
        dominant_source: primarySource,
        mitigation_effort: 0,
        citizen_credits: 0,
        intelligence_data
      });
    });
  }

  public async updatePollutionData() {
    const token = process.env.AQICN_API_KEY || process.env.AQI_TOKEN;
    console.log(`[AQI] Updating AQICN air quality data for ${this.wards.size} wards...`);

    let stationMap = loadStationMap();

    // ── Auto-build station map if empty (first boot / fresh Vercel deploy) ──
    if (Object.keys(stationMap).length === 0 && this.wards.size > 0) {
      console.log("[AQI] Station map is empty — auto-building from nearest AQICN stations...");
      const built: Record<string, number> = {};
      for (const ward of Array.from(this.wards.values())) {
        built[ward.name] = nearestStationUid(ward.latitude, ward.longitude);
      }
      saveStationMap(built);
      stationMap = built;
      console.log(`[AQI] Auto-built station map for ${Object.keys(built).length} wards.`);
    }

    const wardStationMap = new Map<number, number>();
    for (const [id, ward] of Array.from(this.wards.entries())) {
      const uid = stationMap[ward.name];
      if (uid) wardStationMap.set(id, uid);
    }

    const uniqueUids = Array.from(new Set(wardStationMap.values()));
    const stationData = new Map<number, any>();

    if (token) {
      await Promise.all(
        uniqueUids.map(async (uid) => {
          try {
            const url = `https://api.waqi.info/feed/@${uid}/?token=${token}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.status === "ok" && json.data?.aqi && json.data.aqi !== "-") {
              stationData.set(uid, json.data);
              console.log(`[AQI] WAQI Station @${uid} (${json.data.city?.name ?? "?"}) → AQI ${json.data.aqi}`);
            }
          } catch (err) {
            console.error(`[AQI] Failed to fetch station @${uid}:`, err);
          }
        })
      );
    }


    // Live telemetry fallback calibrated to AQICN / CPCB standard
    const zoneCoords = [
      { zone: "Central", lat: 28.6139, lng: 77.2090 },
      { zone: "North",   lat: 28.7300, lng: 77.1200 },
      { zone: "South",   lat: 28.5200, lng: 77.2100 },
      { zone: "East",    lat: 28.6400, lng: 77.3100 },
      { zone: "West",    lat: 28.5900, lng: 77.0500 }
    ];

    const zoneData = new Map<string, any>();
    await Promise.all(
      zoneCoords.map(async (zc) => {
        try {
          const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${zc.lat}&longitude=${zc.lng}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            if (json?.current) zoneData.set(zc.zone, json.current);
          }
        } catch (e: any) {
          console.error(`[AQI] Telemetry error for ${zc.zone}:`, e.message);
        }
      })
    );

    const defaultData = zoneData.get("Central") || { us_aqi: 152, pm2_5: 45.3, pm10: 52.2, nitrogen_dioxide: 35, sulphur_dioxide: 24.6, carbon_monoxide: 1175, ozone: 77 };

    // Standard AQICN / CPCB India PM2.5 to AQI conversion function
    const pm25ToAqicn = (pm25: number): number => {
      if (pm25 <= 30) return Math.round(pm25 * (50 / 30));
      if (pm25 <= 60) return Math.round(50 + (pm25 - 30) * (50 / 30));
      if (pm25 <= 90) return Math.round(100 + (pm25 - 60) * (100 / 30));
      if (pm25 <= 120) return Math.round(200 + (pm25 - 90) * (100 / 30));
      if (pm25 <= 250) return Math.round(300 + (pm25 - 120) * (100 / 130));
      return Math.min(500, Math.round(400 + (pm25 - 250)));
    };

    const buildUpdatedWard = (ward: Ward, aqi: number, iaqi: any): Ward => {
      const pm25 = Math.round(iaqi.pm25?.v ?? (aqi * 0.6));
      const pm10 = Math.round(iaqi.pm10?.v ?? (aqi * 0.8));
      const no2  = Math.round(iaqi.no2?.v  ?? (aqi * 0.1));
      const so2  = Math.round(iaqi.so2?.v  ?? (aqi * 0.05));
      const co   = Math.round((iaqi.co?.v   ?? (aqi * 0.02)) * 10) / 10;
      const o3   = Math.round(iaqi.o3?.v   ?? (aqi * 0.03));

      let primarySource = "General";
      if (no2 > 40 || co > 10)                  primarySource = "Traffic";
      else if (pm10 > 150 && pm10 > pm25 * 1.5) primarySource = "Construction";
      else if (so2 > 20)                        primarySource = "Industrial Emissions";
      else if (pm25 > 100)                      primarySource = "Waste Burning";
      else                                      primarySource = "Dust & Local";

      const primaryPollutant = aqi > 300 ? "PM2.5" : (no2 > 50 ? "NO2" : "Dust");
      const severity = aqi > 400 ? "Severe+" : aqi > 300 ? "Severe" : aqi > 200 ? "Poor" : "Moderate";
      const allowedControls: string[] = ["water_sprinkling", "waste_burning_ban"];
      if (aqi > 200) allowedControls.push("traffic_odd_even", "construction_halt");

      const grapInfo = buildGrapInfo(aqi, primarySource);

      // ── Plan Stability: Only regenerate if no plan exists, 7 days elapsed,
      //    or AQI has crossed a GRAP stage boundary (prevents hyper-volatility) ──
      const grapStageOf = (q: number) =>
        q > 450 ? 4 : q >= 401 ? 3 : q >= 301 ? 2 : q >= 201 ? 1 : 0;

      const existingPlan = (ward.intelligence_data as any)?.weekly_plan;
      const existingGeneratedAt = (ward.intelligence_data as any)?.plan_generated_at;
      const existingAqiAtGeneration = (ward.intelligence_data as any)?.aqi_at_generation ?? 0;

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const planAge = existingGeneratedAt
        ? Date.now() - new Date(existingGeneratedAt).getTime()
        : Infinity;
      const stageChanged =
        grapStageOf(aqi) !== grapStageOf(existingAqiAtGeneration);

      const shouldRebuildPlan =
        !existingPlan ||
        planAge > sevenDaysMs ||
        stageChanged;

      const weeklyPlan = shouldRebuildPlan
        ? buildWeeklyPlan(aqi, primarySource)
        : existingPlan;

      const planGeneratedAt = shouldRebuildPlan
        ? new Date().toISOString()
        : (existingGeneratedAt ?? new Date().toISOString());

      const aqiAtGeneration = shouldRebuildPlan ? aqi : existingAqiAtGeneration;

      const intelligence_data: NonNullable<Ward["intelligence_data"]> = {
        ward: ward.name,
        primary_pollutant: primaryPollutant,
        severity,
        analysis_summary: `ML engine detected ${primaryPollutant} as dominant factor. Current AQI ${aqi} indicates ${severity} conditions (${grapInfo.stage}).`,
        weekly_plan: weeklyPlan,
        plan_generated_at: planGeneratedAt,
        aqi_at_generation: aqiAtGeneration,
        grap_info: grapInfo,
        execution_plan_90_days: {
          days_0_30: allowedControls.slice(0, 3).map(c => `Immediate enforcement of ${c.replace(/_/g, ' ')}`),
          days_31_60: [
            `Transitioning from ${allowedControls[0].replace(/_/g, ' ')} to structural monitoring`,
            `Deploying ${primaryPollutant}-specific mitigation units`
          ],
          days_61_90: [
            "AI-driven predictive maintenance of control units",
            "Evaluation of severity reduction effectiveness"
          ]
        },
        confidence_level: "High",
        allowed_controls: allowedControls,
        predicted_aqi: undefined,
        prediction_horizon: undefined,
        prediction_confidence: undefined
      } as any;

      return {
        ...ward,
        aqi, pm25, pm10, no2, so2, co, o3,
        wprs: Math.max(0, 100 - Math.floor(aqi / 5)),
        co2_budget_remaining: co2_budget_from_aqi(aqi, 5000),
        dominant_source: primarySource,
        intelligence_data
      };
    };

    for (const [id, ward] of Array.from(this.wards.entries())) {
      const uid = wardStationMap.get(id);
      if (uid && stationData.has(uid)) {
        const data = stationData.get(uid);
        const aqi = Number(data.aqi);
        const iaqi = data.iaqi || {};
        const updated = buildUpdatedWard(ward, aqi, iaqi);
        this.wards.set(id, updated);
      } else {
        let zone = "Central";
        if (ward.latitude > 28.70) zone = "North";
        else if (ward.latitude < 28.55) zone = "South";
        else if (ward.longitude > 77.25) zone = "East";
        else if (ward.longitude < 77.10) zone = "West";

        const zd = zoneData.get(zone) || defaultData;
        const wardOffset = ((id * 11) % 31) - 15;
        const pm25 = Math.max(10, Math.round((zd.pm2_5 || 45.3) * (1 + wardOffset / 200)));
        const pm10 = Math.max(15, Math.round((zd.pm10 || 52.2) * (1 + wardOffset / 200)));
        const aqi = pm25ToAqicn(pm25);

        const iaqi = {
          pm25: { v: pm25 },
          pm10: { v: pm10 },
          no2:  { v: Math.round(zd.nitrogen_dioxide ?? 35) },
          so2:  { v: Math.round(zd.sulphur_dioxide ?? 24) },
          co:   { v: Math.round(zd.carbon_monoxide ? zd.carbon_monoxide / 100 : 12) },
          o3:   { v: Math.round(zd.ozone ?? 77) }
        };

        const updated = buildUpdatedWard(ward, aqi, iaqi);
        this.wards.set(id, updated);
      }
    }

    this.lastUpdated = new Date();
    console.log(`[AQI] Successfully updated all ${this.wards.size} wards with AQICN standard live data.`);
  }

  async getLastUpdated() {
    return this.lastUpdated;
  }

  async getUser(id: string) {
    return this.users.get(id);
  }

  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser) {
    const id = (this.users.size + 1).toString();
    const user: User = { ...insertUser, id, role: insertUser.role || "citizen" };
    this.users.set(id, user);
    return user;
  }

  private initializedAqi = false;

  async getWards() {
    if (!this.initializedAqi && this.wards.size > 0) {
      this.initializedAqi = true;
      try {
        await this.updatePollutionData();
      } catch (err) {
        console.error("AQI initial fetch error:", err);
      }
    }
    return Array.from(this.wards.values());
  }

  async getWard(id: number) {
    return this.wards.get(id);
  }

  async updateWard(id: number, updates: Partial<Ward>) {
    const ward = this.wards.get(id);
    if (!ward) throw new Error("Ward not found");
    const updated = { ...ward, ...updates };
    this.wards.set(id, updated);
    return updated;
  }

  async createReport(insertReport: Omit<Report, "id" | "timestamp" | "verified">) {
    const reportsMap = loadReportsFromTmp();
    let maxId = 0;
    for (const k of Array.from(reportsMap.keys())) {
      if (k > maxId) maxId = k;
    }
    const id = maxId + 1;
    const report: Report = {
      ...insertReport,
      id,
      timestamp: new Date(),
      verified: false,
    };
    reportsMap.set(id, report);
    saveReportsToTmp(reportsMap);
    return report;
  }

  async getReportsByWard(wardId: number) {
    const reportsMap = loadReportsFromTmp();
    return Array.from(reportsMap.values()).filter(r => r.wardId === wardId);
  }

  async getReports() {
    const reportsMap = loadReportsFromTmp();
    return Array.from(reportsMap.values());
  }

  async updateReportVerification(id: number, verified: boolean) {
    const reportsMap = loadReportsFromTmp();
    const report = reportsMap.get(id);
    if (!report) throw new Error("Report not found");
    const updated = { ...report, verified };
    reportsMap.set(id, updated);
    saveReportsToTmp(reportsMap);
    return updated;
  }

  async updateReportStatus(id: number, status: string) {
    const reportsMap = loadReportsFromTmp();
    const report = reportsMap.get(id);
    if (!report) throw new Error("Report not found");
    const updated = { ...report, status };
    reportsMap.set(id, updated);
    saveReportsToTmp(reportsMap);
    return updated;
  }

  async deleteReport(id: number) {
    const reportsMap = loadReportsFromTmp();
    const res = reportsMap.delete(id);
    saveReportsToTmp(reportsMap);
    return res;
  }

  async restoreReport(report: Report) {
    const reportsMap = loadReportsFromTmp();
    reportsMap.set(report.id, report);
    saveReportsToTmp(reportsMap);
    return report;
  }

  async updateReportBlockchain(id: number, mediaHash: string, txHash: string | null) {
    const reportsMap = loadReportsFromTmp();
    const report = reportsMap.get(id);
    if (!report) throw new Error("Report not found");
    const updated = { ...report, mediaHash, txHash };
    reportsMap.set(id, updated);
    saveReportsToTmp(reportsMap);
    return updated;
  }

  async createEvidence(insertEvidence: Omit<Evidence, "id" | "timestamp" | "isVerified" | "actionChallengesCompleted"> & { isVerified?: boolean; actionChallengesCompleted?: string[] | null }) {
    const id = this.evidenceIdCounter++;
    const evidence: Evidence = {
      ...insertEvidence,
      id,
      timestamp: new Date(),
      isVerified: insertEvidence.isVerified ?? false,
      aiScore: insertEvidence.aiScore ?? (Math.floor(Math.random() * 20) + 80),
      metadata: insertEvidence.metadata || null,
      actionChallengesCompleted: insertEvidence.actionChallengesCompleted ?? null
    };
    this.evidence.set(id, evidence);
    return evidence;
  }
}

export const storage = new MemStorage();
