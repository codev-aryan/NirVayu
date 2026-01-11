import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
});

export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(), 
  longitude: real("longitude").notNull(),
  
  // Pollution Metrics
  aqi: integer("aqi").notNull(),
  pm25: real("pm25").notNull(),
  pm10: real("pm10").notNull(),
  no2: real("no2").notNull(),
  so2: real("so2").notNull().default(0),
  co: real("co").notNull().default(0),
  o3: real("o3").notNull().default(0),

  // Derived Metrics
  wprs: integer("wprs").notNull(), 
  co2_budget_remaining: real("co2_budget_remaining").notNull(), 
  
  // Status
  emergency_mode: boolean("emergency_mode").default(false).notNull(),
  
  // Controls & Simulation
  active_controls: jsonb("active_controls").$type<string[]>().notNull().default([]), 
  dominant_source: text("dominant_source").notNull().default("Traffic"),
  
  // Dynamic Intelligence Layer
  intelligence_data: jsonb("intelligence_data").$type<{
    ward: string;
    primary_pollutant: string;
    severity: string;
    analysis_summary: string;
    execution_plan_90_days: {
      days_0_30: string[];
      days_31_60: string[];
      days_61_90: string[];
    };
    confidence_level: string;
    allowed_controls: string[];
    predicted_aqi?: number;
    prediction_horizon?: string;
    prediction_confidence?: number;
  }>(),

  // Credit Point System (New)
  mitigation_effort: integer("mitigation_effort").notNull().default(0), // 0-100
  citizen_credits: integer("citizen_credits").notNull().default(0), // Total aggregated per ward
});

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users);
export const insertWardSchema = createInsertSchema(wards);

// === EXPLICIT API TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Ward = typeof wards.$inferSelect;
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  wardId: integer("wardId").notNull(),
  pollutionType: text("pollutionType").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  mediaHash: text("mediaHash").notNull(),
  txHash: text("txHash"),
  verified: boolean("verified").default(false).notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, timestamp: true, verified: true });
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// Simulation Types
export type ControlType = 
  | "traffic_odd_even" 
  | "traffic_heavy_ban" 
  | "construction_halt" 
  | "dust_sprinkling" 
  | "industry_shutdown" 
  | "waste_burning_ban";

export interface UpdateControlsRequest {
  controls: ControlType[];
}

export interface SimulationRequest {
  trafficReduction: number; // 0-100%
  constructionHalt: boolean;
  dustSuppression: number; // 0-100%
}

export const simulationResultSchema = z.object({
  currentAqi: z.number(),
  projectedAqi: z.number(),
  absoluteImprovement: z.number(),
  percentageImprovement: z.number(),
  breakdown: z.object({
    dust: z.number(),
    traffic: z.number(),
    construction: z.number()
  }),
  summary: z.string()
});

export type SimulationResult = z.infer<typeof simulationResultSchema>;

export interface CitizenPlanRequest {
  ageGroup: "child" | "adult" | "elderly";
  condition: "healthy" | "asthma" | "sensitive";
  outdoorHours: number;
}

export interface CitizenPlanResponse {
  safeTimeWindow: string;
  avoidTimeWindow: string;
  maskLevel: "None" | "Cloth" | "N95" | "Surgical" | "Avoid Outdoors";
  advice: string;
  preventiveMeasures: {
    personal: string[];
    lifestyle: string[];
    community: string[];
  };
  checklist: {
    do: string[];
    avoid: string[];
  };
}
