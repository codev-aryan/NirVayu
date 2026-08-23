import { type Ward, type User, type InsertUser, type Report, type InsertReport, type Evidence, type InsertEvidence } from "@shared/schema";
import fs from "fs";
import path from "path";
import * as turf from "@turf/turf";
import { execFile } from "child_process";
import { promisify } from "util";
import session from "express-session";
import createMemoryStore from "memorystore";

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
 
      const intelligence_data: any = {
        ward: feature.properties.Ward_Name ?? `Ward ${id}`,
        primary_pollutant: primaryPollutant,
        severity,
        analysis_summary: `ML engine detected ${primaryPollutant} as dominant factor. Current AQI ${aqi} indicates ${severity} conditions. Prediction: ${prediction.predictedAqi} AQI in ${prediction.horizon} (Confidence: ${Math.round(prediction.confidence * 100)}%).`,
        execution_plan_90_days: {
          days_0_30: allowedControls.slice(0, 3).map(c => `Immediate enforcement of ${c.replace(/_/g, ' ')}`),
          days_31_60: [
            `Transitioning from ${allowedControls[0].replace(/_/g, ' ')} to structural monitoring`,
            `Deploying ${primaryPollutant}-specific mitigation units`,
            `Ward-level compliance score integration (Current: ${Math.max(0, 100 - Math.floor(aqi / 5))}%)`
          ],
          days_61_90: [
            "AI-driven predictive maintenance of control units",
            "Community-led green buffer expansion",
            `Evaluation of ${severity} reduction effectiveness`
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

    // ── 1. Check global cache (survives Vercel warm invocations) ──
    const now = Date.now();
    if (
      global.__aqiCache &&
      now - global.__aqiCache.fetchedAt < AQI_CACHE_TTL_MS &&
      global.__aqiCache.entries.length > 0
    ) {
      console.log(`[AQI] Hydrating ${global.__aqiCache.entries.length} wards from global cache (age: ${Math.round((now - global.__aqiCache.fetchedAt) / 1000)}s)`);
      for (const entry of global.__aqiCache.entries) {
        const ward = this.wards.get(entry.wardId);
        if (ward) {
          this.wards.set(entry.wardId, {
            ...ward,
            aqi: entry.aqi,
            pm25: entry.pm25,
            pm10: entry.pm10,
            no2: entry.no2,
            so2: entry.so2,
            co: entry.co,
            o3: entry.o3,
            dominant_source: entry.dominant_source,
            intelligence_data: entry.intelligence_data,
            wprs: entry.wprs,
            co2_budget_remaining: entry.co2_budget_remaining,
          });
        }
      }
      this.lastUpdated = new Date(global.__aqiCache.fetchedAt);
      return;
    }

    console.log(`[AQI] Starting bounds-based update for ${this.wards.size} wards...`);

    // ── 2. ONE call: fetch all stations in Delhi bounding box ──
    // Delhi bounds: SW(28.40, 76.80) → NE(28.90, 77.40)
    const boundsUrl = `https://api.waqi.info/map/bounds/?latlng=28.40,76.80,28.90,77.40&token=${token}`;
    let stations: Array<{ uid: number; lat: number; lon: number; aqi: string | number; station: { name: string } }> = [];
    try {
      const bRes = await fetch(boundsUrl);
      const bJson = await bRes.json();
      if (bJson.status === "ok" && Array.isArray(bJson.data)) {
        stations = bJson.data;
        console.log(`[AQI] Bounds API returned ${stations.length} stations in Delhi.`);
      } else {
        console.warn("[AQI] Bounds API returned no data:", bJson.status);
      }
    } catch (err) {
      console.error("[AQI] Bounds API call failed:", err);
    }

    if (stations.length === 0) {
      console.warn("[AQI] No stations found — skipping update.");
      return;
    }

    // ── 3. Map each ward to its nearest station ──
    const wardStationMap = new Map<number, number>();
    for (const [id, ward] of Array.from(this.wards.entries())) {
      let bestUid = stations[0].uid;
      let bestDist = Infinity;
      for (const s of stations) {
        const dist = turf.distance(
          turf.point([ward.longitude, ward.latitude]),
          turf.point([s.lon, s.lat])
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestUid = s.uid;
        }
      }
      wardStationMap.set(id, bestUid);
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

      const intelligence_data: NonNullable<Ward["intelligence_data"]> = {
        ward: ward.name,
        primary_pollutant: primaryPollutant,
        severity,
        analysis_summary: `ML engine detected ${primaryPollutant} as dominant factor. Current AQI ${aqi} indicates ${severity} conditions.`,
        execution_plan_90_days: {
          days_0_30: allowedControls.slice(0, 3).map(c => `Immediate enforcement of ${c.replace(/_/g, ' ')}`),
          days_31_60: [
            `Transitioning from ${allowedControls[0].replace(/_/g, ' ')} to structural monitoring`,
            `Deploying ${primaryPollutant}-specific mitigation units`,
            `Ward-level compliance score integration (Current: ${Math.max(0, 100 - Math.floor(aqi / 5))}%)`
          ],
          days_61_90: [
            "AI-driven predictive maintenance of control units",
            "Community-led green buffer expansion",
            `Evaluation of ${severity} reduction effectiveness`
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

      try {
        const prediction = predictFutureAqi(aqi, pm25, pm10);
        updated.intelligence_data!.analysis_summary += ` Prediction: ${prediction.predictedAqi} AQI in ${prediction.horizon} (Confidence: ${Math.round(prediction.confidence * 100)}%).`;
        updated.intelligence_data!.predicted_aqi = prediction.predictedAqi;
        updated.intelligence_data!.prediction_horizon = prediction.horizon;
        updated.intelligence_data!.prediction_confidence = prediction.confidence;
      } catch { /* ignore */ }

      return updated;
    };

    // ── 6. Apply station data to each ward ──
    let updatedCount = 0;
    for (const [id, ward] of Array.from(this.wards.entries())) {
      const uid = wardStationMap.get(id);
      if (uid === undefined) continue;
      const data = stationData.get(uid);
      if (!data) continue;
      const aqi = Number(data.aqi);
      const iaqi = data.iaqi || {};
      this.wards.set(id, buildUpdatedWard(ward, aqi, iaqi));
      updatedCount++;
    }
    console.log(`[AQI] Applied live AQI to ${updatedCount}/${this.wards.size} wards.`);

    // ── 7. Write to global cache ──
    global.__aqiCache = {
      fetchedAt: Date.now(),
      entries: Array.from(this.wards.values()).map(w => ({
        wardId: w.id,
        aqi: w.aqi,
        pm25: w.pm25,
        pm10: w.pm10,
        no2: w.no2,
        so2: w.so2,
        co: w.co,
        o3: w.o3,
        dominant_source: w.dominant_source,
        intelligence_data: w.intelligence_data,
        wprs: w.wprs,
        co2_budget_remaining: w.co2_budget_remaining,
      }))
    };
    console.log(`[AQI] Global cache updated with ${global.__aqiCache.entries.length} ward entries.`);

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
    await this.updatePollutionData();
    return Array.from(this.wards.values());
  }

  async getWard(id: number) {
    await this.updatePollutionData();
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
