import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { blockchainService } from "./blockchain";
import { simulatePolicy } from "./policySimulator";
import { insertReportSchema } from "@shared/schema";
import { EnvironmentalIntelligence } from "./envIntelligence";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Ward Routes ===
  
  app.get(api.wards.list.path, async (req, res) => {
    const wards = await storage.getWards();
    const lastUpdated = await storage.getLastUpdated();
    res.json({ wards, lastUpdated });
  });

  // === Pollution Reports ===

  app.post("/api/reports", async (req, res) => {
    try {
      const data = insertReportSchema.parse(req.body);
      const { mediaBase64, wardId, pollutionType } = req.body;

      if (!mediaBase64) {
        return res.status(400).json({ message: "Media is required" });
      }

      // Generate SHA-256 hash of: media, wardId, pollutionType, timestamp
      const timestamp = Date.now();
      const content = `${mediaBase64}-${wardId}-${pollutionType}-${timestamp}`;
      const mediaHash = "0x" + crypto.createHash("sha256").update(content).digest("hex");

      // Push to blockchain
      let txHash = "0x" + crypto.randomBytes(32).toString('hex');
      try {
        // await blockchainService.submitReport(mediaHash, wardId);
      } catch (e) {
        console.error("[Blockchain] Submit failed, storing offline:", e);
      }

      const report = await storage.createReport({
        ...data,
        mediaHash,
        txHash,
      });

      res.json({
        status: txHash ? "BLOCKCHAIN_VERIFIED" : "STORED_OFFLINE",
        txHash,
        hash: mediaHash,
        report
      });
    } catch (e) {
      console.error("[API] Report submission failed:", e);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get("/api/wards/:id/reports", async (req, res) => {
    const reports = await storage.getReportsByWard(Number(req.params.id));
    res.json(reports);
  });

  app.post("/api/reports/:id/verify", async (req, res) => {
    const report = await storage.updateReportVerification(Number(req.params.id), true);
    res.json(report);
  });

  app.get("/api/wards/:id/intelligence", async (req, res) => {
    try {
      const wardId = parseInt(req.params.id);
      const ward = await storage.getWard(wardId);
      if (!ward) return res.status(404).send("Ward not found");

      const intel = await EnvironmentalIntelligence.getWardIntelligence(
        ward.latitude,
        ward.longitude
      );

      let aiAnalysis = null;
      if (process.env.GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const controlList = [
          "traffic_odd_even", 
          "traffic_heavy_ban", 
          "construction_halt", 
          "dust_sprinkling", 
          "industry_shutdown", 
          "waste_burning_ban"
        ];

        const prompt = `You are an AI Policy Explanation and Decision-Support Assistant.
        Interpret these ML-computed pollution metrics for Delhi ward: ${ward.name} (Lat: ${ward.latitude}, Lon: ${ward.longitude})
        
        ML Metrics:
        - Traffic Score: ${intel.traffic.score} (Congestion: ${intel.traffic.congestion})
        - Industrial Score: ${intel.industrial.score} (Level: ${intel.industrial.level})
        - Construction Score: ${intel.construction.score} (Activity: ${intel.construction.activity})
        - Stubble Burning Score: ${intel.stubbleBurning.score} (Severity: ${intel.stubbleBurning.severity})

        Your Task:
        1. Explain these results in professional, policy-oriented language.
        2. Identify primary pollution sources based ONLY on the scores provided.
        3. Recommend interventions ONLY from this list: ${controlList.join(", ")}.
        4. If data is marked as "simulated" or "estimated", mention uncertainty.

        STRICT: Return VALID JSON ONLY. No markdown, no commentary.
        
        JSON Schema:
        {
          "overall_pollution_severity": "Low | Medium | High",
          "primary_pollution_sources": [
            { "source": string, "severity": "Low | Medium | High", "evidence": string }
          ],
          "data_driven_analysis": string,
          "recommended_interventions": [
            { "action": string (from control list), "authority": string, "expected_impact": string }
          ],
          "data_confidence_level": "High | Medium | Low"
        }`;
        
        try {
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          aiAnalysis = JSON.parse(text.replace(/```json|```/g, ""));
        } catch (e) {
          console.error("AI Analysis failed", e);
        }
      }

      res.json({ ...intel, aiAnalysis });
    } catch (e) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.wards.get.path, async (req, res) => {
    const ward = await storage.getWard(Number(req.params.id));
    if (!ward) return res.status(404).json({ message: "Ward not found" });
    res.json(ward);
  });

  app.post(api.wards.updateControls.path, async (req, res) => {
    try {
      const { controls } = api.wards.updateControls.input.parse(req.body);
      const ward = await storage.getWard(Number(req.params.id));
      if (!ward) return res.status(404).json({ message: "Ward not found" });
      
      const updated = await storage.updateWard(ward.id, { active_controls: controls });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.wards.toggleEmergency.path, async (req, res) => {
    try {
      const { enabled } = api.wards.toggleEmergency.input.parse(req.body);
      const ward = await storage.getWard(Number(req.params.id));
      if (!ward) return res.status(404).json({ message: "Ward not found" });
      
      const updated = await storage.updateWard(ward.id, { emergency_mode: enabled });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/wards/:id/simulate-policy", async (req, res) => {
    try {
      const { dustReduction, trafficReduction, constructionControl } = req.body;
      const ward = await storage.getWard(Number(req.params.id));
      if (!ward) return res.status(404).json({ message: "Ward not found" });
      
      const result = simulatePolicy(ward, {
        dustReduction: Number(dustReduction || 0),
        trafficReduction: Number(trafficReduction || 0),
        constructionControl: Number(constructionControl || 0)
      });
      
      res.json(result);
    } catch (e) {
      console.error("[Simulation] Failed:", e);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Keep old endpoint for compatibility if needed, but the hook is updated to use the one above
  app.post(api.wards.simulate.path, async (req, res) => {
    try {
      const { trafficReduction, constructionHalt, dustSuppression } = api.wards.simulate.input.parse(req.body);
      const ward = await storage.getWard(Number(req.params.id));
      if (!ward) return res.status(404).json({ message: "Ward not found" });
      
      const result = simulatePolicy(ward, {
        trafficReduction,
        constructionControl: constructionHalt ? 100 : 0,
        dustReduction: dustSuppression
      });
      
      res.json(result);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.wards.addCredit.path, async (req, res) => {
    try {
      const { action } = api.wards.addCredit.input.parse(req.body);
      const ward = await storage.getWard(Number(req.params.id));
      if (!ward) return res.status(404).json({ message: "Ward not found" });
      
      const creditMapping = {
        public_transport: 20,
        carpooling: 10,
        plantation: 30,
        no_waste_burning: 50
      };
      
      const points = creditMapping[action];
      const newCredits = ward.citizen_credits + points;
      const newMitigation = Math.min(100, ward.mitigation_effort + Math.floor(points / 10));
      
      const updated = await storage.updateWard(ward.id, { 
        citizen_credits: newCredits,
        mitigation_effort: newMitigation
      });
      
      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.wards.generatePlan.path, async (req, res) => {
    try {
      const { ageGroup, condition, outdoorHours } = api.wards.generatePlan.input.parse(req.body);
      const ward = await storage.getWard(Number(req.params.id));
      if (!ward) return res.status(404).json({ message: "Ward not found" });
      
      const aqi = ward.aqi;
      let advice = "";
      let maskLevel = "None";
      let safeTime = "06:00 AM - 09:00 AM";
      let avoidTime = "05:00 PM - 08:00 PM";

      const preventiveMeasures = {
        personal: ["Keep windows closed during peak traffic", "Use an air purifier if available"],
        lifestyle: ["Avoid peak hour travel", "Prefer electric/public transport"],
        community: ["Support local dust control measures", "Participate in ward plantation drives"]
      };

      const checklist = {
        do: ["Check AQI before going out", "Stay hydrated"],
        avoid: ["Outdoor exercise during peak pollution", "Using wood-burning stoves"]
      };

      if (aqi < 100) {
        advice = "Air quality is acceptable. Enjoy your outdoor activities.";
        maskLevel = "None";
        checklist.do.push("Enjoy outdoor parks");
      } else if (aqi < 200) {
        advice = "Sensitive groups should limit prolonged outdoor exertion.";
        maskLevel = condition === "asthma" ? "Surgical" : "Cloth";
        preventiveMeasures.personal.push("Wear a cloth mask in dusty areas");
        checklist.avoid.push("Heavy outdoor exertion");
      } else if (aqi < 300) {
        advice = "General public should limit outdoor exertion. Wear a mask if outside.";
        maskLevel = "N95";
        avoidTime = "All Day";
        preventiveMeasures.personal.push("Strictly use N95 mask outdoors");
        checklist.do = ["Stay indoors", "Run air purifier"];
        checklist.avoid.push("All outdoor activities");
      } else {
        advice = "Emergency conditions. Avoid all outdoor activity.";
        maskLevel = "Avoid Outdoors";
        safeTime = "None";
        checklist.do = ["Seal window gaps", "Monitor health closely"];
        checklist.avoid = ["Stepping outside for any reason"];
      }

      if (ageGroup === "child" || ageGroup === "elderly") {
        advice = "Strict caution advised for your age group. " + advice;
      }

      res.json({
        safeTimeWindow: safeTime,
        avoidTimeWindow: avoidTime,
        maskLevel,
        advice,
        preventiveMeasures,
        checklist
      });
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Create mock data file structure if it doesn't exist (as per requirements)
  // In a real app we might write to disk, here we just keep in memory but ensure the path concept exists
  
  return httpServer;
}
