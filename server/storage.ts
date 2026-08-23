import { type Ward, type User, type InsertUser, type Report, type InsertReport, type Evidence, type InsertEvidence } from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";
import { execFile } from "child_process";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MemoryStore = createMemoryStore(session);
const execFilePromise = promisify(execFile);

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
}
const AQI_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

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
  return [
    {
      day: "Day 1 (Today)",
      title: "Immediate Emergency Mitigation",
      action: source.includes("traffic")
        ? "Deploy anti-smog guns & traffic police at peak choke points; enforce heavy vehicle diversion."
        : source.includes("construction")
        ? "Halt un-covered earthwork; deploy continuous water sprinklers across all active sites."
        : source.includes("industrial")
        ? "Conduct surprise stack emission inspections & issue immediate halt notices to non-compliant units."
        : "Deploy mobile anti-burning task forces for night-time waste patrol & instant fine imposition.",
      priority: (aqi > 300 ? "Critical" : "High") as "Critical" | "High" | "Medium"
    },
    {
      day: "Day 2",
      title: "Targeted Emission Suppression",
      action: "Mechanized road sweeping across arterial corridors combined with chemical dust suppressant application.",
      priority: "High" as "Critical" | "High" | "Medium"
    },
    {
      day: "Day 3",
      title: "Source Inspection & Patrols",
      action: "Zero-tolerance patrol against open trash/plastic burning and diesel generator non-compliance.",
      priority: "High" as "Critical" | "High" | "Medium"
    },
    {
      day: "Day 4",
      title: "Mid-Week AQI & Hotspot Re-evaluation",
      action: "Recalibrate sensor network data, audit high-AQI clusters, and adjust misting vehicle deployment routes.",
      priority: "Medium" as "Critical" | "High" | "Medium"
    },
    {
      day: "Day 5",
      title: "Commercial & Site Compliance Audit",
      action: "Verify C&D dust barrier height, green netting, and anti-smog gun operational logs across all projects.",
      priority: "Medium" as "Critical" | "High" | "Medium"
    },
    {
      day: "Day 6",
      title: "Traffic Corridor & Idling Reduction",
      action: "Optimize signal timing at major junctions to reduce vehicle idling time and emissions during evening rush hour.",
      priority: "Medium" as "Critical" | "High" | "Medium"
    },
    {
      day: "Day 7",
      title: "Weekly Performance & GRAP Stage Audit",
      action: "Evaluate 7-day AQI trend, compile ward compliance scores, and update GRAP enforcement stage for next week.",
      priority: "Medium" as "Critical" | "High" | "Medium"
    }
  ];
}


// ─── Station-map helpers (wardName → WAQI station idx) ───
function getStationMapPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "server/data/station-map.json"),
    path.resolve(process.cwd(), "dist/server/data/station-map.json"),
    path.resolve(__dirname, "data/station-map.json"),
    path.resolve(__dirname, "../server/data/station-map.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0]; // default write path
}

function loadStationMap(): Record<string, number> {
  if (global.__stationMap) return global.__stationMap;
  try {
    const raw = fs.readFileSync(getStationMapPath(), "utf8");
    global.__stationMap = JSON.parse(raw);
  } catch {
    global.__stationMap = {};
  }
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
      path.resolve(__dirname, "../attached_assets/Delhi_Wards_1768070860005.geojson"),
      path.resolve(__dirname, "../../attached_assets/Delhi_Wards_1768070860005.geojson"),
      path.resolve(__dirname, "attached_assets/Delhi_Wards_1768070860005.geojson"),
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
    if (!token) {
      console.warn("AQICN_API_KEY/AQI_TOKEN not found, skipping update.");
      return;
    }

    console.log(`[AQI] Starting ward-centric update for ${this.wards.size} wards...`);

    const stationMap = loadStationMap();
    const wardStationMap = new Map<number, number>();
    for (const [id, ward] of Array.from(this.wards.entries())) {
      const uid = stationMap[ward.name];
      if (uid) wardStationMap.set(id, uid);
    }

    // ── 4. Fetch AQI for unique station IDs only (parallel) ──
    const uniqueUids = Array.from(new Set(wardStationMap.values()));
    console.log(`[AQI] Fetching ${uniqueUids.length} unique stations in parallel...`);

    const stationData = new Map<number, any>();
    await Promise.all(
      uniqueUids.map(async (uid) => {
        try {
          const url = `https://api.waqi.info/feed/@${uid}/?token=${token}`;
          const res = await fetch(url);
          const json = await res.json();
          if (json.status === "ok" && json.data?.aqi && json.data.aqi !== "-") {
            stationData.set(uid, json.data);
            console.log(`[AQI] Station @${uid} (${json.data.city?.name ?? "?"}) → AQI ${json.data.aqi}`);
          }
        } catch (err) {
          console.error(`[AQI] Failed to fetch station @${uid}:`, err);
        }
      })
    );

    // ── 5. Helper: build updated ward from station data ──
    const buildUpdatedWard = (ward: Ward, aqi: number, iaqi: any): Ward => {
      const pm25 = iaqi.pm25?.v ?? (aqi * 0.6);
      const pm10 = iaqi.pm10?.v ?? (aqi * 0.8);
      const no2  = iaqi.no2?.v  ?? (aqi * 0.1);
      const so2  = iaqi.so2?.v  ?? (aqi * 0.05);
      const co   = iaqi.co?.v   ?? (aqi * 0.02);
      const o3   = iaqi.o3?.v   ?? (aqi * 0.03);

      let primarySource = "General";
      if (no2 > 40 || co > 10)               primarySource = "Traffic";
      else if (pm10 > 150 && pm10 > pm25 * 1.5) primarySource = "Construction";
      else if (so2 > 20)                     primarySource = "Industrial Emissions";
      else if (pm25 > 100)                   primarySource = "Waste Burning";
      else                                   primarySource = "Dust & Local";

      const primaryPollutant = aqi > 300 ? "PM2.5" : (no2 > 50 ? "NO2" : "Dust");
      const severity = aqi > 400 ? "Severe+" : aqi > 300 ? "Severe" : aqi > 200 ? "Poor" : "Moderate";
      const allowedControls: string[] = ["water_sprinkling", "waste_burning_ban"];
      if (aqi > 200) allowedControls.push("traffic_odd_even", "construction_halt");

      const grapInfo = buildGrapInfo(aqi, primarySource);
      const weeklyPlan = buildWeeklyPlan(aqi, primarySource);

      const intelligence_data: NonNullable<Ward["intelligence_data"]> = {
        ward: ward.name,
        primary_pollutant: primaryPollutant,
        severity,
        analysis_summary: `ML engine detected ${primaryPollutant} as dominant factor. Current AQI ${aqi} indicates ${severity} conditions (${grapInfo.stage}).`,
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
        predicted_aqi: undefined,
        prediction_horizon: undefined,
        prediction_confidence: undefined
      };

      const updated: Ward = {
        ...ward,
        aqi, pm25, pm10, no2, so2, co, o3,
        wprs: Math.max(0, 100 - Math.floor(aqi / 5)),
        co2_budget_remaining: co2_budget_from_aqi(aqi, 5000),
        dominant_source: primarySource,
        intelligence_data
      };
      return updated;
    };

    // Second pass: Estimation for wards that still have 0 or failed
    for (const [id, ward] of Array.from(this.wards.entries())) {
      if (ward.aqi === 0 || ward.aqi === null) {
        let nearestWard: any = null;
        let minDistance = Infinity;

        for (const [otherId, otherWard] of Array.from(this.wards.entries())) {
          if (id === otherId || !otherWard.aqi || otherWard.aqi === 0) continue;

          const dist = turf.distance(
            turf.point([ward.longitude, ward.latitude]),
            turf.point([otherWard.longitude, otherWard.latitude])
          );

          if (dist < minDistance) {
            minDistance = dist;
            nearestWard = otherWard;
          }
        }

        if (nearestWard) {
          const estimatedAqi = nearestWard.aqi;
          this.wards.set(id, {
            ...ward,
            aqi: estimatedAqi,
            pm25: nearestWard.pm25,
            pm10: nearestWard.pm10,
            no2: nearestWard.no2,
            wprs: nearestWard.wprs,
            intelligence_data: nearestWard.intelligence_data as any,
            dominant_source: nearestWard.dominant_source
          });
          console.log(`[AQI] ${ward.name} → ${estimatedAqi} (estimated from ${nearestWard.name})`);
        }
      }
    }

    this.lastUpdated = new Date();
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

  async getWards() {
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
    const id = this.reportIdCounter++;
    const report: Report = {
      ...insertReport,
      id,
      timestamp: new Date(),
      verified: false,
    };
    this.reports.set(id, report);
    return report;
  }

  async getReportsByWard(wardId: number) {
    return Array.from(this.reports.values()).filter(r => r.wardId === wardId);
  }

  async getReports() {
    return Array.from(this.reports.values());
  }

  async updateReportVerification(id: number, verified: boolean) {
    const report = this.reports.get(id);
    if (!report) throw new Error("Report not found");
    const updated = { ...report, verified };
    this.reports.set(id, updated);
    return updated;
  }

  async updateReportStatus(id: number, status: string) {
    const report = this.reports.get(id);
    if (!report) throw new Error("Report not found");
    const updated = { ...report, status };
    this.reports.set(id, updated);
    return updated;
  }

  async deleteReport(id: number) {
    return this.reports.delete(id);
  }

  async restoreReport(report: Report) {
    this.reports.set(report.id, report);
    if (report.id >= this.reportIdCounter) {
      this.reportIdCounter = report.id + 1;
    }
    return report;
  }

  async updateReportBlockchain(id: number, mediaHash: string, txHash: string | null) {
    const report = this.reports.get(id);
    if (!report) throw new Error("Report not found");
    const updated = { ...report, mediaHash, txHash };
    this.reports.set(id, updated);
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
