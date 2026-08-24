import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Cigarette, AlertCircle, ShieldAlert, HeartPulse, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CigaretteHealthRiskCardProps {
  wardName?: string;
  aqi: number;
  pm25: number;
  className?: string;
}

interface HealthCondition {
  id: string;
  name: string;
  minAqi: number; // Only show this tab if current AQI >= minAqi
  getRiskLevel: (aqi: number) => {
    label: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    colorClass: string;
    bgBoxClass: string;
    borderClass: string;
  };
  symptoms: string;
  dos: string[];
  donts: string[];
}

const HEALTH_CONDITIONS: HealthCondition[] = [
  {
    id: "headaches",
    name: "Headaches",
    minAqi: 0,
    getRiskLevel: (aqi) => {
      if (aqi <= 50) return { label: "LOW", colorClass: "bg-emerald-600 text-white", bgBoxClass: "bg-emerald-50 dark:bg-emerald-950/20", borderClass: "border-emerald-200 dark:border-emerald-900/40" };
      if (aqi <= 100) return { label: "MODERATE", colorClass: "bg-amber-600 text-white", bgBoxClass: "bg-amber-50 dark:bg-amber-950/20", borderClass: "border-amber-200 dark:border-amber-900/40" };
      if (aqi <= 200) return { label: "HIGH", colorClass: "bg-red-600 text-white", bgBoxClass: "bg-rose-50 dark:bg-rose-950/30", borderClass: "border-rose-200 dark:border-rose-900/50" };
      return { label: "CRITICAL", colorClass: "bg-purple-700 text-white", bgBoxClass: "bg-purple-50 dark:bg-purple-950/30", borderClass: "border-purple-200 dark:border-purple-900/50" };
    },
    symptoms: "Tight, band-like pressure across the forehead and temples, Extra sensitivity to light, noise, or strong smells, Sluggishness and trouble staying focused.",
    dos: [
      "Choose indoors with clean indoor air whenever pollution levels climb.",
      "Stay hydrated through the day and take short breaks from devices or harsh light if migraines hit you easily.",
      "Keep close any prescribed headache or migraine relief within reach."
    ],
    donts: [
      "Try not to power through demanding outdoor exercise while the AQI is worse.",
      "Don't brush off pain that feels sharper or different from your usual."
    ]
  },
  {
    id: "eye-irritation",
    name: "Eye Irritation",
    minAqi: 40,
    getRiskLevel: (aqi) => {
      if (aqi <= 100) return { label: "MODERATE", colorClass: "bg-amber-600 text-white", bgBoxClass: "bg-amber-50 dark:bg-amber-950/20", borderClass: "border-amber-200 dark:border-amber-900/40" };
      if (aqi <= 200) return { label: "HIGH", colorClass: "bg-red-600 text-white", bgBoxClass: "bg-rose-50 dark:bg-rose-950/30", borderClass: "border-rose-200 dark:border-rose-900/50" };
      return { label: "CRITICAL", colorClass: "bg-purple-700 text-white", bgBoxClass: "bg-purple-50 dark:bg-purple-950/30", borderClass: "border-purple-200 dark:border-purple-900/50" };
    },
    symptoms: "Burning sensation, redness, watery eyes, dryness, and itchiness caused by airborne particulate friction and chemical irritants.",
    dos: [
      "Use lubricating eye drops (artificial tears) to flush out trapped particulate matter.",
      "Wear protective sunglasses or clear wrap-around glasses when stepping outdoors.",
      "Splash eyes gently with cool, clean water upon returning indoors."
    ],
    donts: [
      "Avoid rubbing your eyes with unwashed hands.",
      "Do not wear contact lenses for extended hours during peak PM2.5 pollution spikes."
    ]
  },
  {
    id: "asthma",
    name: "Asthma",
    minAqi: 50,
    getRiskLevel: (aqi) => {
      if (aqi <= 80) return { label: "MODERATE", colorClass: "bg-amber-600 text-white", bgBoxClass: "bg-amber-50 dark:bg-amber-950/20", borderClass: "border-amber-200 dark:border-amber-900/40" };
      if (aqi <= 180) return { label: "HIGH", colorClass: "bg-red-600 text-white", bgBoxClass: "bg-rose-50 dark:bg-rose-950/30", borderClass: "border-rose-200 dark:border-rose-900/50" };
      return { label: "CRITICAL", colorClass: "bg-purple-700 text-white", bgBoxClass: "bg-purple-50 dark:bg-purple-950/30", borderClass: "border-purple-200 dark:border-purple-900/50" };
    },
    symptoms: "Wheezing, chest tightness, shortness of breath, persistent dry cough, and rapid shallow breathing triggered by fine particles.",
    dos: [
      "Keep your quick-relief rescue inhaler (salbutamol) accessible at all times.",
      "Ensure indoor spaces have active HEPA air purification running.",
      "Monitor peak flow meter readings regularly during high-AQI alerts."
    ],
    donts: [
      "Do not step outdoors without a certified N95 or FFP2 mask.",
      "Avoid outdoor morning workouts when atmospheric thermal inversion traps smoke near the ground."
    ]
  },
  {
    id: "allergies-sinus",
    name: "Allergies & Sinus",
    minAqi: 45,
    getRiskLevel: (aqi) => {
      if (aqi <= 100) return { label: "MODERATE", colorClass: "bg-amber-600 text-white", bgBoxClass: "bg-amber-50 dark:bg-amber-950/20", borderClass: "border-amber-200 dark:border-amber-900/40" };
      return { label: "HIGH", colorClass: "bg-red-600 text-white", bgBoxClass: "bg-rose-50 dark:bg-rose-950/30", borderClass: "border-rose-200 dark:border-rose-900/50" };
    },
    symptoms: "Frequent sneezing, nasal congestion, post-nasal drip, sinus head pressure, and throat tickle from airborne soot.",
    dos: [
      "Use saline nasal sprays or neti pots to cleanse nasal passages daily.",
      "Keep windows and doors tightly sealed during peak traffic and burning hours.",
      "Take steam inhalation before bed to soothe inflamed sinus linings."
    ],
    donts: [
      "Do not dry laundry outdoors where toxic dust and soot settle on fabrics.",
      "Avoid burning incense, candles, or mosquito coils indoors."
    ]
  },
  {
    id: "pregnancy",
    name: "Pregnancy",
    minAqi: 75,
    getRiskLevel: (aqi) => {
      if (aqi <= 140) return { label: "MODERATE", colorClass: "bg-amber-600 text-white", bgBoxClass: "bg-amber-50 dark:bg-amber-950/20", borderClass: "border-amber-200 dark:border-amber-900/40" };
      return { label: "HIGH", colorClass: "bg-red-600 text-white", bgBoxClass: "bg-rose-50 dark:bg-rose-950/30", borderClass: "border-rose-200 dark:border-rose-900/50" };
    },
    symptoms: "Elevated maternal systemic inflammation, potential placental hypoxia, increased fatigue, and heightened blood pressure.",
    dos: [
      "Remain in climate-controlled indoor spaces with active HEPA air filtration.",
      "Maintain high intake of antioxidant-rich foods and stay thoroughly hydrated.",
      "Wear a certified N95 mask whenever travel or transit is unavoidable."
    ],
    donts: [
      "Strictly avoid high-density traffic corridors and industrial emissions zones.",
      "Do not perform strenuous physical exercise during high PM2.5 advisory alerts."
    ]
  },
  {
    id: "heart-issues",
    name: "Heart Issues",
    minAqi: 110,
    getRiskLevel: (aqi) => {
      if (aqi <= 200) return { label: "HIGH", colorClass: "bg-red-600 text-white", bgBoxClass: "bg-rose-50 dark:bg-rose-950/30", borderClass: "border-rose-200 dark:border-rose-900/50" };
      return { label: "CRITICAL", colorClass: "bg-purple-700 text-white", bgBoxClass: "bg-purple-50 dark:bg-purple-950/30", borderClass: "border-purple-200 dark:border-purple-900/50" };
    },
    symptoms: "Elevated blood pressure, rapid pulse, chest tightness, palpitations, and vascular inflammation caused by ultra-fine PM0.1 absorption.",
    dos: [
      "Adhere strictly to prescribed cardiac medication schedule.",
      "Minimize all physical exertion during high AQI alerts.",
      "Seek immediate emergency medical help if experiencing chest discomfort or dizziness."
    ],
    donts: [
      "Do not engage in heavy lifting or strenuous outdoor tasks.",
      "Avoid exposure to second-hand cigarette smoke or diesel exhaust fumes."
    ]
  },
  {
    id: "cold-flu",
    name: "Cold / Flu",
    minAqi: 90,
    getRiskLevel: (aqi) => {
      if (aqi <= 160) return { label: "MODERATE", colorClass: "bg-amber-600 text-white", bgBoxClass: "bg-amber-50 dark:bg-amber-950/20", borderClass: "border-amber-200 dark:border-amber-900/40" };
      return { label: "HIGH", colorClass: "bg-red-600 text-white", bgBoxClass: "bg-rose-50 dark:bg-rose-950/30", borderClass: "border-rose-200 dark:border-rose-900/50" };
    },
    symptoms: "Raw sore throat, persistent dry cough, body aches, hoarseness, and heightened vulnerability to viral respiratory infections.",
    dos: [
      "Gargle with warm salt water twice daily to soothe irritated throat mucosa.",
      "Sip warm herbal teas (ginger, tulsi, honey) to reduce airway inflammation.",
      "Rest adequately to help immune defenses cope with particulate stress."
    ],
    donts: [
      "Avoid cold, carbonated beverages or icy foods during smog episodes.",
      "Do not smoke or expose yourself to indoor combustion sources."
    ]
  },
  {
    id: "copd",
    name: "Chronic COPD",
    minAqi: 130,
    getRiskLevel: (aqi) => {
      return { label: "CRITICAL", colorClass: "bg-purple-700 text-white", bgBoxClass: "bg-purple-50 dark:bg-purple-950/30", borderClass: "border-purple-200 dark:border-purple-900/50" };
    },
    symptoms: "Severe breathlessness, chronic coughing with phlegm, acute fatigue, low oxygen saturation, and frequent pulmonary flare-ups.",
    dos: [
      "Use prescribed bronchodilators and supplemental oxygen as advised by your pulmonologist.",
      "Maintain continuous indoor HEPA air purification.",
      "Contact your healthcare provider at the first sign of an infection or acute spike."
    ],
    donts: [
      "Do not venture outdoors under any circumstances during Severe or Hazardous AQI alerts.",
      "Avoid exposure to harsh household chemical cleaners, paints, or aerosol sprays."
    ]
  }
];

export function CigaretteHealthRiskCard({
  wardName,
  aqi,
  pm25,
  className
}: CigaretteHealthRiskCardProps) {
  // Cigarette Equivalent Math (1 cigarette ≈ 22 µg/m³ PM2.5 per day)
  const dailyCigarettes = Math.max(0.2, Math.round((pm25 / 22) * 10) / 10);
  const weeklyCigarettes = Math.round(dailyCigarettes * 7 * 10) / 10;
  const monthlyCigarettes = Math.round(dailyCigarettes * 30);

  // Dynamic Filtering: Only show conditions that are applicable/active for current AQI
  const activeConditions = HEALTH_CONDITIONS.filter(c => aqi >= c.minAqi);

  const [selectedConditionId, setSelectedConditionId] = useState<string>(
    activeConditions[0]?.id || "headaches"
  );

  // Fallback to first available condition if selected is filtered out
  const currentCondition =
    activeConditions.find(c => c.id === selectedConditionId) || activeConditions[0] || HEALTH_CONDITIONS[0];

  const risk = currentCondition.getRiskLevel(aqi);

  const getAqiStageText = (val: number) => {
    if (val <= 50) return "Good";
    if (val <= 100) return "Moderate";
    if (val <= 150) return "Poor";
    if (val <= 200) return "Unhealthy";
    if (val <= 300) return "Severe";
    return "Hazardous";
  };

  return (
    <Card className={cn("p-6 border-border shadow-sm bg-card rounded-2xl space-y-6", className)}>
      {/* ─── TOP SECTION: CIGARETTE EQUIVALENT ─── */}
      <div className="space-y-4 pb-6 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cigarette className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-extrabold text-foreground tracking-tight uppercase">
              Cigarette Smoke Equivalent
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-600 dark:text-amber-400">
            Berkeley Earth Standard
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Equivalent */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              CIGARETTE EQUIVALENT
            </div>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-400">
              {dailyCigarettes} <span className="text-sm font-semibold text-muted-foreground">per day</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1">
              Equates to breathing local air {wardName ? `in ${wardName}` : "across Delhi"}
            </p>
          </div>

          {/* Weekly Exposure */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              WEEKLY EXPOSURE
            </div>
            <div className="text-3xl font-bold text-foreground">
              {weeklyCigarettes} <span className="text-sm font-normal text-muted-foreground">cigarettes</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1 flex items-center gap-1">
              <span>Source Formula</span>
              <Info className="w-3 h-3 text-muted-foreground inline" />
            </p>
          </div>

          {/* Monthly Exposure */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              MONTHLY EXPOSURE
            </div>
            <div className="text-3xl font-bold text-foreground">
              {monthlyCigarettes} <span className="text-sm font-normal text-muted-foreground">cigarettes</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1">
              Cumulative 30-day toxicity load
            </p>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM SECTION: RISK ASSESSMENTS — PREVENT HEALTH PROBLEMS ─── */}
      <div className="space-y-4">
        <div>
          <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
            RISK ASSESSMENTS
          </div>
          <h2 className="text-xl font-bold font-display text-foreground mt-0.5">
            Prevent Health Problems {wardName ? `— ${wardName}` : ""}
          </h2>
        </div>

        {/* Dynamic Condition Tabs (Filtered ward-wise by current AQI) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {activeConditions.map((condition) => {
            const isSelected = condition.id === currentCondition.id;
            return (
              <button
                key={condition.id}
                onClick={() => setSelectedConditionId(condition.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                  isSelected
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {condition.name}
              </button>
            );
          })}
        </div>

        {/* Selected Condition Risk Card Box */}
        <div className={cn("p-6 rounded-2xl border space-y-6 transition-all", risk.bgBoxClass, risk.borderClass)}>
          {/* Risk Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Badge className={cn("px-3 py-1 font-extrabold text-xs tracking-wider", risk.colorClass)}>
                {risk.label} RISK
              </Badge>
              <h3 className="text-lg font-bold text-foreground">{currentCondition.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1">
              Risk is <strong>{risk.label.toLowerCase()}</strong> for {getAqiStageText(aqi)} conditions (AQI {Math.round(aqi)} {wardName ? `in ${wardName}` : ""}).
            </p>
          </div>

          {/* Common Symptoms */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              COMMON SYMPTOMS
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Some people experience: {currentCondition.symptoms}
            </p>
          </div>

          {/* Do's & Don'ts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/40">
            {/* DO'S Column */}
            <div className="space-y-3">
              <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>DO'S</span>
              </div>
              <ul className="space-y-2">
                {currentCondition.dos.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-normal">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DON'TS Column */}
            <div className="space-y-3">
              <div className="text-[11px] font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>DON'TS</span>
              </div>
              <ul className="space-y-2">
                {currentCondition.donts.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-normal">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
