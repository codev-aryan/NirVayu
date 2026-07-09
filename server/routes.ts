import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { blockchainService } from "./blockchain";
import { simulatePolicy } from "./policySimulator";
import { insertReportSchema, insertEvidenceSchema } from "@shared/schema";
import { EnvironmentalIntelligence } from "./envIntelligence";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as turf from "@turf/turf";
import fs from "fs";
import path from "path";
import express from "express";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Use /tmp in production (Vercel serverless /var/task is read-only, only /tmp is writable)
  const uploadsDir = process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use("/uploads", express.static(uploadsDir));

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
      const { mediaBase64 } = req.body;

      if (!mediaBase64) {
        return res.status(400).json({ message: "Media is required" });
      }

      // Extract mime type and raw base64 data
      const match = mediaBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      let mimeType = "image/jpeg";
      let base64Data = mediaBase64;
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }

      // Gemini AI classification
      const prompt = `
You are an expert AIR QUALITY monitoring AI. Your job is to detect images that show VISIBLE AIR POLLUTION only.

Accepted categories (all must involve visible airborne pollutants — smoke, dust, exhaust, fumes, haze):
- "traffic": Vehicles emitting visible exhaust, heavy traffic congestion with smog/haze, diesel smoke from trucks or buses.
- "construction": Active construction sites with visible dust clouds, cement dust in air, demolition dust, machinery kicking up particulate matter.
- "stubble burning": Agricultural fires, crop/stubble burning with visible smoke rising, farm field fires.
- "other": Any other AIR pollution source with VISIBLE airborne emissions — e.g. factory/industrial chimney smoke, power plant emissions, brick kiln fumes, open garbage/waste burning with smoke, generator exhaust clouds, chemical plant fumes, thick smog or haze layer visibly degrading air quality.

Rejected category:
- "irrelevant": ANYTHING that does not show visible airborne pollution. This includes: water/river/lake pollution, sewage or drain overflow, garbage pile NOT on fire, chemical spill on ground, litter, clean outdoor scenes, selfies, food, indoor spaces, documents, animals, clear skies, or any scene where no smoke/dust/fumes/haze is visible in the air.

DECISION RULE: Ask yourself — "Can I see smoke, dust, exhaust fumes, or haze in this image that is actively in the air?" If NO → "irrelevant". If YES → pick the matching category.

Return ONLY a JSON object (no markdown, no extra text):
{
  "classification": "traffic" | "construction" | "stubble burning" | "other" | "irrelevant",
  "confidence": number (integer 0 to 100),
  "explanation": "State what is visibly in the air in this image, identify the source, and explain your classification decision."
}
`;

      let classification = "irrelevant";
      let confidence = 0;
      let explanation = "Gemini API key is not set or request failed.";
      let aiAnalysisStatus: "ai" | "fallback" = "fallback";

      // Helper: keyword fallback — ONLY accepts descriptions indicating visible AIRBORNE pollution
      const fallbackClassify = (desc: string, reason: string) => {
        const d = desc.toLowerCase();
        // Traffic/vehicle exhaust in air
        if (d.includes("traffic") || d.includes("exhaust") || d.includes("diesel smoke") || d.includes("vehicle smoke") || d.includes("smog") || d.includes("haze")) {
          return { classification: "traffic", confidence: 60, explanation: `${reason} Description suggests vehicle exhaust or traffic-related air pollution.` };
        }
        // Construction dust in air
        if (d.includes("construction dust") || d.includes("cement dust") || d.includes("dust cloud") || d.includes("demolition dust") || d.includes("dust rising")) {
          return { classification: "construction", confidence: 58, explanation: `${reason} Description suggests construction dust in the air.` };
        }
        // Burning with smoke
        if (d.includes("stubble") || d.includes("crop burn") || d.includes("field burn") || d.includes("farm fire") || d.includes("field fire")) {
          return { classification: "stubble burning", confidence: 60, explanation: `${reason} Description suggests agricultural burning with smoke.` };
        }
        // Other air pollution — smoke/fumes from industrial or burning sources
        if (d.includes("smoke") || d.includes("fume") || d.includes("chimney") || d.includes("factory smoke") || d.includes("industrial smoke") || d.includes("kiln") || d.includes("generator smoke") || d.includes("burning garbage") || d.includes("waste burning") || d.includes("open burning")) {
          return { classification: "other", confidence: 55, explanation: `${reason} Description suggests airborne smoke or industrial fumes.` };
        }
        // Everything else — not clearly about air pollution, reject
        return { classification: "irrelevant", confidence: 0, explanation: `${reason} Description does not clearly indicate visible airborne pollution (smoke, dust, fumes, or haze). Only images showing active air pollution are accepted.` };
      };

      if (process.env.GEMINI_API_KEY) {
        // Try models in order — newer/available ones first
        const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"];
        let geminiSuccess = false;
        let lastGeminiError = "";

        for (const modelName of modelsToTry) {
          try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              }
            ]);
            const text = result.response.text().trim();
            // Strip markdown code fences and extract JSON object
            let jsonText = text
              .replace(/```json\s*/gi, "")
              .replace(/```\s*/g, "")
              .trim();
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonText = jsonMatch[0];
            const parsed = JSON.parse(jsonText);
            classification = parsed.classification || "irrelevant";
            confidence = typeof parsed.confidence === "number" ? parsed.confidence : parseInt(parsed.confidence) || 0;
            explanation = parsed.explanation || "AI analyzed the image.";
            aiAnalysisStatus = "ai";
            geminiSuccess = true;
            console.log(`[Gemini AI] Model: ${modelName} | Classification: ${classification}, Confidence: ${confidence}%`);
            break;
          } catch (e: any) {
            lastGeminiError = e?.message || String(e);
            // If this is a key/auth error, don't bother trying other models
            if (lastGeminiError.includes("PERMISSION_DENIED") || lastGeminiError.includes("leaked") || lastGeminiError.includes("API_KEY_INVALID")) {
              console.error(`[Gemini AI] API key error — stopping model retry: ${lastGeminiError.substring(0, 120)}`);
              break;
            }
            console.warn(`[Gemini AI] Model ${modelName} failed, trying next: ${lastGeminiError.substring(0, 80)}`);
          }
        }

        if (!geminiSuccess) {
          console.error(`[Gemini AI] All models failed. Last error: ${lastGeminiError.substring(0, 200)}`);
          const fb = fallbackClassify(data.description || "", "[Fallback — Gemini unavailable]");
          classification = fb.classification;
          confidence = fb.confidence;
          explanation = fb.explanation;
          aiAnalysisStatus = "fallback";
        }
      } else {
        const fb = fallbackClassify(data.description || "", "[Fallback — no API key configured]");
        classification = fb.classification;
        confidence = fb.confidence;
        explanation = fb.explanation;
        aiAnalysisStatus = "fallback";
      }

      if (classification === "irrelevant") {
        return res.status(400).json({ message: "The uploaded image was rejected as it is irrelevant to pollution monitoring." });
      }

      // Automatically detect the nearest ward by calculating distances from the coordinates to ward centroids
      const wards = await storage.getWards();
      if (wards.length === 0) {
        return res.status(500).json({ message: "No wards available in system database." });
      }
      
      let nearestWard = wards[0];
      let minDistance = Infinity;
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);

      for (const w of wards) {
        const dist = turf.distance(
          turf.point([lng, lat]),
          turf.point([w.longitude, w.latitude]),
          { units: "kilometers" }
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestWard = w;
        }
      }

      // Write base64 image to local uploads folder
      const filename = `report_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, Buffer.from(base64Data, "base64"));
      const imageUrl = `/uploads/${filename}`;

      // 1. Write the initial report details to database storage to get a unique report ID
      const report = await storage.createReport({
        wardId: nearestWard.id,
        pollutionType: classification,
        latitude: lat,
        longitude: lng,
        mediaHash: "pending",
        txHash: null,
        imageUrl,
        status: "pending",
        description: data.description || "",
        aiConfidence: confidence,
        aiExplanation: explanation
      });

      // 2. Compute the SHA-256 hash of the image and metadata
      const imageHash = crypto.createHash("sha256").update(Buffer.from(base64Data, "base64")).digest("hex");
      const metadataContent = `${imageHash}-${nearestWard.id}-${classification}-${data.description || ""}-${report.timestamp.getTime()}`;
      const mediaHash = "0x" + crypto.createHash("sha256").update(metadataContent).digest("hex");

      // 3. Register the report hash in the secure cryptographic registry
      await blockchainService.submitReport(mediaHash, nearestWard.id, report);

      // 4. Update the report in the database with the generated mediaHash
      const updatedReport = await storage.updateReportBlockchain(report.id, mediaHash, null);

      res.json({
        status: "VERIFIED",
        txHash: null,
        hash: mediaHash,
        aiAnalysisStatus,
        report: updatedReport
      });
    } catch (e: any) {
      console.error("[API] Report submission failed:", e);
      res.status(400).json({ message: e.message || "Invalid input" });
    }
  });

  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch reports" });
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

  app.post("/api/reports/:id/action", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      if (!["working", "resolved"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateReportVerification(id, true);
      const report = await storage.updateReportStatus(id, status);

      if (status === "resolved") {
        const ward = await storage.getWard(report.wardId);
        if (ward) {
          let newControl = "";
          if (report.pollutionType === "traffic") {
            newControl = "traffic_odd_even";
          } else if (report.pollutionType === "construction") {
            newControl = "construction_halt";
          } else if (report.pollutionType === "stubble burning") {
            newControl = "waste_burning_ban";
          }

          if (newControl && !ward.active_controls.includes(newControl)) {
            const updatedControls = [...ward.active_controls, newControl];
            await storage.updateWard(ward.id, { active_controls: updatedControls });
          }
        }
      }

      res.json(report);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to update report action" });
    }
  });

  app.post("/api/reports/:id/delete-local", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteReport(id);
      if (success) {
        res.json({ success: true, message: "Report deleted from local database (simulation)" });
      } else {
        res.status(404).json({ message: "Report not found" });
      }
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to delete report" });
    }
  });

  app.post("/api/reports/restore", async (req, res) => {
    try {
      const reportData = req.body;
      const report = await storage.restoreReport({
        id: Number(reportData.id),
        wardId: Number(reportData.wardId),
        pollutionType: reportData.pollutionType,
        latitude: Number(reportData.latitude),
        longitude: Number(reportData.longitude),
        timestamp: new Date(reportData.timestamp),
        mediaHash: reportData.mediaHash,
        txHash: reportData.txHash,
        verified: Boolean(reportData.verified),
        imageUrl: reportData.imageUrl,
        status: reportData.status,
        description: reportData.description || "",
        aiConfidence: Number(reportData.aiConfidence || 0),
        aiExplanation: reportData.aiExplanation || ""
      });
      res.json(report);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to restore report" });
    }
  });

  app.get("/api/reports/blockchain-ledger", async (req, res) => {
    try {
      const ledger = await blockchainService.getOnChainReports();
      res.json(ledger);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch blockchain ledger" });
    }
  });

  // === Secure Evidence Verification ===

  app.post("/api/evidence/validate-location", async (req, res) => {
    try {
      const { lat, lng, wardId } = req.body;

      // 1. Get Ward Boundary
      // In a real app we'd query the DB for the specific ward's GeoJSON
      // For this demo, we'll access the in-memory storage which has loaded GeoJSON
      const ward = await storage.getWard(wardId);
      if (!ward) return res.status(404).json({ message: "Ward not found" });

      // 2. Perform Geofence Check
      // We need the raw GeoJSON feature which storage loads but doesn't fully expose in the Ward interface
      // We'll add a helper in storage.ts to get the boundary or assume simplistic radius check fallback if fails
      // For now, let's trust the storage to provide a helper or we implement a simple distance check as robust fallback
      // REAL IMPLEMENTATION: Using Turf.js if we had the polygon content

      // Fallback to strict distance check (e.g. 2km radius from ward center) for MVP stability if polygon missing
      const userPoint = turf.point([lng, lat]);
      const wardCenter = turf.point([ward.longitude, ward.latitude]);
      const distance = turf.distance(userPoint, wardCenter, { units: 'kilometers' });

      const MAX_RADIUS_KM = 3.0; // Wards are roughly this size
      const inside = distance <= MAX_RADIUS_KM;

      res.json({
        valid: inside,
        distance: distance.toFixed(2) + "km",
        message: inside ? "Location verified" : "You are outside the ward boundary"
      });
    } catch (e) {
      console.error("Geofence error:", e);
      res.status(500).json({ message: "Validation failed" });
    }
  });

  app.post("/api/evidence", async (req, res) => {
    try {
      const data = insertEvidenceSchema.parse(req.body);
      const { imageUrl, wardId, actionType, metadata } = req.body;

      // 1. Security Checks (Simulated)
      // In production: Validate EXIF headers, checking for 'Adobe Photoshop' in software tag
      const exifOriginal = metadata?.exif || {};
      const deviceUserAgent = metadata?.device || "Unknown";

      let manipulationScore = 0; // 0 = Clean, 100 = Manipulated
      let facialMatchScore = 0;
      let verificationStatus = "pending";
      let notes = [];

      // Heuristic: Check timestamp freshness
      const captureTime = metadata?.timestamp || Date.now();
      if (Date.now() - captureTime > 5 * 60 * 1000) {
        notes.push("Submission delay > 5 mins");
        manipulationScore += 20;
      }

      // Heuristic: EXIF Logic
      if (!exifOriginal.DateTimeOriginal && !exifOriginal.GPSLatitude) {
        notes.push("Missing core EXIF data");
        manipulationScore += 30; // Suspicious
      }

      // 2. Simulated AI Liveness & Face Match
      // Randomly succeed for demo purposes unless specifically triggered to fail
      facialMatchScore = Math.floor(Math.random() * 15) + 85; // 85-100%
      const aiLivenessScore = Math.floor(Math.random() * 20) + 80;

      if (manipulationScore < 40 && facialMatchScore > 80) {
        verificationStatus = "verified";
      } else {
        verificationStatus = "flagged";
      }

      const evidence = await storage.createEvidence({
        ...data,
        actionChallengesCompleted: data.actionChallengesCompleted as string[] | null | undefined,
        aiScore: aiLivenessScore,
        manipulationScore,
        facialMatchScore,
        verificationStatus,
        metadata: {
          ...metadata,
          securityNotes: notes,
          serverProcessedAt: new Date().toISOString()
        }
      });

      // Auto-reward if verified
      if (verificationStatus === "verified") {
        const ward = await storage.getWard(wardId);
        if (ward) {
          const points = 50;
          await storage.updateWard(ward.id, {
            citizen_credits: ward.citizen_credits + points,
            mitigation_effort: Math.min(100, ward.mitigation_effort + 5)
          });
        }
      }

      res.json({
        success: true,
        evidence,
        verification: verificationStatus === "verified" ? "Verified by AI" : "Pending Manual Review",
        debug: { manipulationScore, facialMatchScore }
      });
    } catch (e) {
      console.error("[API] Evidence submission failed:", e);
      res.status(400).json({ message: "Invalid input or schema validation error" });
    }
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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
