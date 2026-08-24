import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import {
  ShieldCheck, ArrowLeft, ChevronRight, Home, Car, Briefcase,
  BookOpen, Footprints, Trees, Wind, AlertTriangle, CheckCircle2,
  Navigation, Compass, Sun, Zap, SkipForward
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "landing" | "onboarding" | "result";

type AgeGroup = "u12" | "12-18" | "19-59" | "60+";
type Environment = "indoors" | "office" | "traffic" | "construction" | "outdoors" | "moving";
type OutdoorHours = "<1" | "1-3" | "3-6" | "6-9" | "9+";
type TodayActivity = "working" | "studying" | "travelling" | "exercising" | "home" | "outdoors";
type ConcernLevel = "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";

interface Profile {
  ageGroup: AgeGroup;
  environment: Environment;
  outdoorHours: OutdoorHours;
  todayActivity: TodayActivity;
  occupation?: string;
}

// ─── Recommendation Engine ─────────────────────────────────────────────────────

function outdoorHoursScore(h: OutdoorHours): number {
  return { "<1": 1, "1-3": 2, "3-6": 3, "6-9": 4, "9+": 5 }[h];
}

function calcConcernLevel(profile: Profile, aqi: number, pm25: number): ConcernLevel {
  const hoursScore = outdoorHoursScore(profile.outdoorHours);
  const trafficEnv = profile.environment === "traffic" || profile.environment === "moving";
  const outdoorEnv = profile.environment === "outdoors" || profile.environment === "construction";
  const vulnerable = profile.ageGroup === "u12" || profile.ageGroup === "60+";
  const activeToday = profile.todayActivity === "exercising" || profile.todayActivity === "outdoors";

  let score = 0;

  // AQI contribution
  if (aqi <= 100) score += 0;
  else if (aqi <= 200) score += 1;
  else if (aqi <= 300) score += 2;
  else if (aqi <= 400) score += 3;
  else score += 4;

  // Exposure contribution
  score += hoursScore - 1;

  // Environment contribution
  if (trafficEnv) score += 1;
  if (outdoorEnv) score += 1;

  // Vulnerability
  if (vulnerable) score += 1;

  // Activity
  if (activeToday) score += 1;

  // PM2.5 spike bonus
  if (pm25 > 120) score += 1;

  if (score <= 2) return "LOW";
  if (score <= 4) return "MODERATE";
  if (score <= 6) return "HIGH";
  return "VERY HIGH";
}

function getDrivers(profile: Profile, aqi: number, dominantPollutant: string, pm25: number): { text: string; level: ConcernLevel }[] {
  const drivers: { text: string; level: ConcernLevel }[] = [];
  const hoursScore = outdoorHoursScore(profile.outdoorHours);

  // Outdoor hours
  if (hoursScore >= 4) drivers.push({ text: "High outdoor exposure time today", level: "VERY HIGH" });
  else if (hoursScore === 3) drivers.push({ text: "Moderate outdoor exposure time", level: "HIGH" });
  else if (hoursScore <= 2 && (profile.environment === "indoors" || profile.environment === "office")) {
    drivers.push({ text: "Low outdoor exposure — mostly indoor", level: "LOW" });
  }

  // Environment
  if (profile.environment === "traffic" || profile.environment === "moving") {
    drivers.push({ text: "Traffic-dominant environment", level: aqi > 200 ? "HIGH" : "MODERATE" });
  }
  if (profile.environment === "construction") {
    drivers.push({ text: "Construction / dust exposure environment", level: "HIGH" });
  }
  if (profile.environment === "outdoors") {
    drivers.push({ text: "Prolonged outdoor environment", level: aqi > 200 ? "VERY HIGH" : "HIGH" });
  }

  // AQI
  if (aqi > 300) drivers.push({ text: `AQI is ${aqi} — Very Poor air quality`, level: "VERY HIGH" });
  else if (aqi > 200) drivers.push({ text: `AQI is ${aqi} — Poor air quality`, level: "HIGH" });
  else if (aqi > 100) drivers.push({ text: `AQI is ${aqi} — Moderate air quality`, level: "MODERATE" });

  // PM2.5
  if (pm25 > 120) drivers.push({ text: `PM2.5 at ${pm25} µg/m³ — significantly elevated`, level: "HIGH" });
  else if (pm25 > 60) drivers.push({ text: `PM2.5 at ${pm25} µg/m³ — elevated`, level: "MODERATE" });

  // Dominant pollutant context
  if (dominantPollutant.toLowerCase().includes("no2")) {
    drivers.push({ text: "NO₂ elevated — traffic-related pollutant", level: "HIGH" });
  }

  // Activity
  if (profile.todayActivity === "exercising") {
    drivers.push({ text: "High-intensity exercise increases air intake significantly", level: aqi > 150 ? "HIGH" : "MODERATE" });
  }

  // Age
  if (profile.ageGroup === "u12") drivers.push({ text: "Children breathe proportionally more air than adults", level: "HIGH" });
  if (profile.ageGroup === "60+") drivers.push({ text: "Older adults are more sensitive to air pollution", level: "HIGH" });

  return drivers.slice(0, 4);
}

interface MatrixItem { label: string; icon: string; level: ConcernLevel; show: boolean }

function getSafelifeMatrix(profile: Profile, aqi: number): MatrixItem[] {
  const hoursScore = outdoorHoursScore(profile.outdoorHours);
  const highAqi = aqi > 200;
  const veryHighAqi = aqi > 300;

  const workLevel: ConcernLevel =
    profile.environment === "indoors" || profile.environment === "office"
      ? (aqi > 300 ? "MODERATE" : "LOW")
      : (veryHighAqi ? "VERY HIGH" : "HIGH");

  const commuteLevel: ConcernLevel =
    profile.environment === "traffic" || profile.environment === "moving"
      ? (veryHighAqi ? "VERY HIGH" : "HIGH")
      : (highAqi ? "MODERATE" : "LOW");

  const exerciseLevel: ConcernLevel =
    veryHighAqi ? "VERY HIGH" : highAqi ? "HIGH" : aqi > 100 ? "MODERATE" : "LOW";

  const homeLevel: ConcernLevel =
    veryHighAqi ? "MODERATE" : highAqi ? "LOW" : "LOW";

  const outdoorLevel: ConcernLevel =
    veryHighAqi ? "VERY HIGH" : highAqi ? "HIGH" : aqi > 100 ? "MODERATE" : "LOW";

  const constructionLevel: ConcernLevel =
    aqi > 200 ? "VERY HIGH" : "HIGH";

  const isStudent = profile.ageGroup === "12-18" || profile.ageGroup === "u12" ||
    profile.occupation === "Student" || profile.todayActivity === "studying";
  const isWorker = profile.todayActivity === "working" || profile.todayActivity === "travelling";
  const isDelivery = profile.occupation === "Delivery worker" || profile.occupation === "Driver";
  const isConstruction = profile.environment === "construction" || profile.occupation === "Construction worker";

  return [
    {
      label: isDelivery ? "Work (Delivery)" : isStudent ? "School" : "Work",
      icon: isDelivery ? "🛵" : isStudent ? "🎓" : "💼",
      level: workLevel,
      show: isWorker || profile.todayActivity === "studying"
    },
    {
      label: "Commute",
      icon: "🚗",
      level: commuteLevel,
      show: profile.todayActivity !== "home"
    },
    {
      label: isConstruction ? "Dust / Site Exposure" : "Exercise",
      icon: isConstruction ? "🏗️" : "🏃",
      level: isConstruction ? constructionLevel : exerciseLevel,
      show: true
    },
    {
      label: "Home",
      icon: "🏠",
      level: homeLevel,
      show: true
    },
    {
      label: "Outdoor Time",
      icon: "🌳",
      level: outdoorLevel,
      show: hoursScore >= 2 || profile.environment === "outdoors" || profile.todayActivity === "outdoors"
    }
  ].filter(i => i.show);
}

interface Recommendation { action: string; reason: string; icon: string }

function getRecommendations(profile: Profile, aqi: number, dominantPollutant: string, pm25: number): Recommendation[] {
  const recs: Recommendation[] = [];
  const hoursScore = outdoorHoursScore(profile.outdoorHours);
  const dom = dominantPollutant.toLowerCase();
  const isTraffic = profile.environment === "traffic" || profile.environment === "moving";
  const isOutdoor = profile.environment === "outdoors" || hoursScore >= 3;
  const isConstruction = profile.environment === "construction";
  const isDelivery = profile.occupation === "Delivery worker" || profile.occupation === "Driver";
  const isTrafficPolice = profile.occupation === "Traffic police";
  const isVulnerable = profile.ageGroup === "u12" || profile.ageGroup === "60+";
  const exercising = profile.todayActivity === "exercising";
  const highAqi = aqi > 200;
  const veryHighAqi = aqi > 300;

  // Rule: High AQI + outdoor exposure → reduce outdoor time
  if (highAqi && isOutdoor) {
    recs.push({
      action: "Reduce unnecessary time outdoors during the current pollution peak",
      reason: `Your outdoor exposure is already ${hoursScore >= 4 ? "very high" : "significant"} and current AQI is ${aqi}.`,
      icon: "🔴"
    });
  }

  // Rule: Exercise outdoors → move indoors
  if (exercising && highAqi) {
    recs.push({
      action: "Move high-intensity exercise indoors or postpone",
      reason: "Physical exertion increases breathing rate, raising the amount of pollutants inhaled. PM2.5 is currently elevated.",
      icon: "🏃"
    });
  }

  // Rule: Traffic environment + NO2 or any high AQI → lower-exposure route
  if (isTraffic || isDelivery || isTrafficPolice || profile.todayActivity === "travelling") {
    recs.push({
      action: "Use a lower-exposure route and minimize roadside waiting time",
      reason: dom.includes("no2")
        ? "NO₂ is elevated — a traffic-related pollutant concentrated at busy intersections."
        : "Traffic corridors concentrate PM2.5 and exhaust. Side roads and metro reduce exposure.",
      icon: "🚗"
    });
  }

  // Rule: Construction environment → dust
  if (isConstruction) {
    recs.push({
      action: "Reduce time near active dust-generating areas and take breaks in enclosed spaces",
      reason: "PM10 from construction dust is your primary concern. Enclosed spaces reduce inhalation significantly.",
      icon: "🏗️"
    });
  }

  // Rule: Vulnerable age groups
  if (isVulnerable && highAqi) {
    recs.push({
      action: profile.ageGroup === "u12"
        ? "Keep children's outdoor activity brief and in sheltered areas"
        : "Avoid strenuous outdoor activity and take rest breaks indoors",
      reason: profile.ageGroup === "u12"
        ? "Children breathe proportionally more air than adults, increasing exposure."
        : "Older adults are more sensitive to PM2.5 and NO₂ at elevated concentrations.",
      icon: profile.ageGroup === "u12" ? "👶" : "👴"
    });
  }

  // Rule: Delivery worker
  if (isDelivery && highAqi) {
    recs.push({
      action: "Take short breaks in enclosed or sheltered spaces between deliveries",
      reason: "Prolonged outdoor and traffic exposure compounds pollution intake over a full work shift.",
      icon: "🛵"
    });
  }

  // Rule: Window / indoor
  if (aqi > 200) {
    recs.push({
      action: "Keep windows sealed until outdoor pollution decreases",
      reason: `Outdoor PM2.5 at ${pm25} µg/m³ will infiltrate indoor spaces through open windows.`,
      icon: "🏠"
    });
  } else if (aqi > 100) {
    recs.push({
      action: "Open windows only between 12:00 PM – 4:00 PM when sunlight disperses ground-level inversion",
      reason: "Thermal inversion traps pollutants at ground level overnight and in the morning.",
      icon: "🪟"
    });
  }

  // Rule: PM10 dominant → dust precautions
  if (dom.includes("dust") || dom.includes("pm10")) {
    recs.push({
      action: "Avoid dry-sweeping indoors; use a damp microfiber mop instead",
      reason: "Dry sweeping resuspends coarse PM10 particles into breathable air.",
      icon: "🌿"
    });
  }

  // Fallback if < 3 recs
  if (recs.length < 3 && aqi > 100) {
    recs.push({
      action: "Stay hydrated and take short breaks in clean indoor environments",
      reason: "Good hydration supports the respiratory system's natural defences against airborne particles.",
      icon: "💧"
    });
  }

  return recs.slice(0, 5);
}

function getActivityAdvice(activity: TodayActivity, aqi: number, pm25: number) {
  type State = "RECOMMENDED" | "USE CAUTION" | "CONSIDER ALTERNATIVE" | "NOT RECOMMENDED";
  const map: Record<TodayActivity, { label: string; icon: string }> = {
    working: { label: "Work / Office", icon: "💼" },
    studying: { label: "Studying", icon: "🎓" },
    travelling: { label: "Travelling", icon: "🚗" },
    exercising: { label: "Outdoor Exercise", icon: "🏃" },
    home: { label: "Staying Home", icon: "🏠" },
    outdoors: { label: "Outdoor Time", icon: "🌳" }
  };

  const { label, icon } = map[activity];
  let state: State;
  let reason: string;
  let alternative: string | null = null;

  if (activity === "exercising") {
    if (aqi <= 100) { state = "RECOMMENDED"; reason = "Air quality is currently acceptable for outdoor exercise."; }
    else if (aqi <= 150) { state = "USE CAUTION"; reason = "AQI is moderate. Consider reducing intensity and duration."; alternative = "Prefer parks over roadsides."; }
    else if (aqi <= 250) { state = "CONSIDER ALTERNATIVE"; reason = `PM2.5 at ${pm25} µg/m³. High-intensity exercise significantly increases pollutant intake.`; alternative = "Consider an indoor workout session instead."; }
    else { state = "NOT RECOMMENDED"; reason = "Current pollution levels make outdoor high-intensity exercise inadvisable."; alternative = "Move exercise indoors or postpone to a lower-pollution period."; }
  } else if (activity === "outdoors") {
    if (aqi <= 100) { state = "RECOMMENDED"; reason = "Air quality is currently good for outdoor time."; }
    else if (aqi <= 200) { state = "USE CAUTION"; reason = "Take periodic breaks in sheltered or indoor areas."; }
    else if (aqi <= 300) { state = "CONSIDER ALTERNATIVE"; reason = "Extended outdoor time not advisable at current AQI."; alternative = "Limit outdoor time and prefer enclosed environments."; }
    else { state = "NOT RECOMMENDED"; reason = "Air quality is significantly degraded today."; alternative = "Move activities indoors where possible."; }
  } else if (activity === "travelling") {
    if (aqi <= 150) { state = "RECOMMENDED"; reason = "Travel is fine. Prefer metro or lower-traffic routes where possible."; }
    else if (aqi <= 250) { state = "USE CAUTION"; reason = "Avoid prolonged roadside waiting. Prefer enclosed transit."; }
    else { state = "CONSIDER ALTERNATIVE"; reason = "Traffic corridors have concentrated pollutants. Use metro or covered routes."; alternative = "Minimize roadside exposure time."; }
  } else if (activity === "home") {
    if (aqi <= 200) { state = "RECOMMENDED"; reason = "Staying home avoids peak outdoor pollution exposure."; }
    else { state = "USE CAUTION"; reason = "Keep windows closed to prevent outdoor PM2.5 infiltration."; }
  } else {
    // working / studying — depends mostly on environment, give general
    if (aqi <= 200) { state = "RECOMMENDED"; reason = "Indoor environments provide good protection from outdoor pollution."; }
    else { state = "USE CAUTION"; reason = "Ensure windows are closed and ventilation is controlled."; }
  }

  return { label, icon, state, reason, alternative };
}

function getHomeAdvice(aqi: number, pm25: number) {
  let windowStatus: "OPEN" | "TIMED" | "SEALED";
  let windowReason: string;
  let ventilationPeriod: string | null = null;

  if (aqi <= 100) {
    windowStatus = "OPEN";
    windowReason = "Outdoor air quality is currently good. Windows can remain open.";
    ventilationPeriod = "All day";
  } else if (aqi <= 200) {
    windowStatus = "TIMED";
    windowReason = `PM2.5 is ${pm25} µg/m³. Ground-level inversion is weaker during midday solar heating.`;
    ventilationPeriod = "12:00 PM – 4:00 PM";
  } else {
    windowStatus = "SEALED";
    windowReason = `Outdoor PM2.5 at ${pm25} µg/m³ will infiltrate indoor spaces through open windows.`;
    ventilationPeriod = null;
  }

  return { windowStatus, windowReason, ventilationPeriod };
}

function getRouteMetrics(tripType: "office" | "school" | "market" | "park", aqi: number) {
  const multipliers: Record<string, { green: number; direct: number; label: string; greenName: string; directName: string }> = {
    office: { green: 0.72, direct: 1.28, label: "Office Commute", greenName: "Metro / Green Park Corridor", directName: "Arterial Ring Road (Congested)" },
    school: { green: 0.65, direct: 1.35, label: "School Drop-off", greenName: "Inner Sector Service Road", directName: "Main Bus Transit Corridor" },
    market: { green: 0.70, direct: 1.20, label: "Market / Shopping", greenName: "Covered Pedestrian Arcade", directName: "Open Street Market (Diesel Autos)" },
    park: { green: 0.60, direct: 1.40, label: "Park / Fitness Walk", greenName: "Tree-Dense Inner Bio-Park", directName: "Roadside Open Footpath" }
  };
  const m = multipliers[tripType];
  const greenAqi = Math.round(aqi * m.green);
  const directAqi = Math.round(aqi * m.direct);
  const savingPct = Math.round((1 - m.green / m.direct) * 100);
  return { ...m, greenAqi, directAqi, savingPct };
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const CONCERN_CONFIG: Record<ConcernLevel, { color: string; bg: string; border: string; dot: string }> = {
  LOW: { color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-300 dark:border-emerald-700", dot: "🟢" },
  MODERATE: { color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-300 dark:border-amber-700", dot: "🟡" },
  HIGH: { color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-300 dark:border-orange-700", dot: "🟠" },
  "VERY HIGH": { color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-300 dark:border-rose-700", dot: "🔴" }
};

function ConcernBadge({ level, className }: { level: ConcernLevel; className?: string }) {
  const cfg = CONCERN_CONFIG[level];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border", cfg.bg, cfg.border, cfg.color, className)}>
      {cfg.dot} {level}
    </span>
  );
}

function ActivityStateBadge({ state }: { state: string }) {
  const map: Record<string, string> = {
    "RECOMMENDED": "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300",
    "USE CAUTION": "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300",
    "CONSIDER ALTERNATIVE": "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-300",
    "NOT RECOMMENDED": "bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300"
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border", map[state] || map["USE CAUTION"])}>
      {state}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">{children}</p>
  );
}

// ─── Landing Card ─────────────────────────────────────────────────────────────

function LandingCard({ onStart, aqi }: { onStart: () => void; aqi: number }) {
  const cfg = aqi > 300 ? CONCERN_CONFIG["VERY HIGH"] : aqi > 200 ? CONCERN_CONFIG["HIGH"] : aqi > 100 ? CONCERN_CONFIG["MODERATE"] : CONCERN_CONFIG["LOW"];
  return (
    <Card className="border-primary/20 shadow-md overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground leading-tight">SafeLifePlanner</h3>
            <p className="text-xs text-muted-foreground mt-0.5">How does today's air affect <em>you</em>?</p>
          </div>
          <div className={cn("ml-auto px-2.5 py-1 rounded-full text-xs font-extrabold border shrink-0", cfg.bg, cfg.border, cfg.color)}>
            AQI {aqi}
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Air pollution doesn't affect everyone the same way. Tell us a little about yourself to get personalized safety recommendations for today.
        </p>

        <Button onClick={onStart} className="w-full font-bold" size="lg">
          <ShieldCheck className="w-4 h-4 mr-2" />
          CHECK MY AIR RISK
        </Button>

        <p className="text-[10px] text-muted-foreground text-center leading-tight">
          No account needed · No data saved · Takes ~20 seconds
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Onboarding Flow ──────────────────────────────────────────────────────────

const OCCUPATION_OPTIONS = [
  "Student", "Office / IT", "Teacher", "Traffic police", "Construction worker",
  "Delivery worker", "Driver", "Street vendor", "Sanitation", "Healthcare",
  "Outdoor worker", "Homemaker", "Retired", "Other"
];

function OnboardingFlow({
  onComplete,
  onBack,
  wardName
}: {
  onComplete: (profile: Profile) => void;
  onBack: () => void;
  wardName: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [age, setAge] = useState<AgeGroup | null>(null);
  const [env, setEnv] = useState<Environment | null>(null);
  const [hours, setHours] = useState<OutdoorHours | null>(null);
  const [activity, setActivity] = useState<TodayActivity | null>(null);
  const [occupation, setOccupation] = useState<string | undefined>(undefined);

  const totalSteps = 5;

  const finish = (occ?: string) => {
    if (!age || !env || !hours || !activity) return;
    onComplete({ ageGroup: age, environment: env, outdoorHours: hours, todayActivity: activity, occupation: occ });
  };

  const ChipGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-2 gap-2.5">{children}</div>
  );

  const Chip = ({
    selected, onClick, icon, label, wide
  }: { selected: boolean; onClick: () => void; icon: string; label: string; wide?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left",
        wide && "col-span-2",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-md"
          : "bg-card border-border hover:border-primary/50 hover:bg-muted/50 text-foreground"
      )}
    >
      <span className="text-xl leading-none shrink-0">{icon}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );

  const StepHeader = ({ q }: { q: string }) => (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {step <= 4 ? `Step ${step} of 4` : "Optional"}
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={cn("h-1.5 rounded-full transition-all", s <= step ? "w-6 bg-primary" : "w-4 bg-muted")} />
          ))}
        </div>
      </div>
      <h3 className="text-base font-extrabold text-foreground uppercase tracking-wide leading-snug">{q}</h3>
    </div>
  );

  const NextBtn = ({ disabled, onClick }: { disabled: boolean; onClick: () => void }) => (
    <Button onClick={onClick} disabled={disabled} className="w-full font-bold mt-4" size="lg">
      Continue <ChevronRight className="w-4 h-4 ml-1" />
    </Button>
  );

  return (
    <Card className="border-primary/20 shadow-md overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">SafeLifePlanner</span>
          </div>
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">{wardName}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
          >
            {step === 1 && (
              <div>
                <StepHeader q="Who are you?" />
                <ChipGrid>
                  {([["u12", "👶", "Under 12"], ["12-18", "🎓", "12–18"], ["19-59", "🧑", "19–59"], ["60+", "👴", "60+"]] as [AgeGroup, string, string][]).map(([v, ic, lb]) => (
                    <Chip key={v} selected={age === v} onClick={() => setAge(v)} icon={ic} label={lb} />
                  ))}
                </ChipGrid>
                <NextBtn disabled={!age} onClick={() => setStep(2)} />
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHeader q="Where do you spend most of your day?" />
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    ["indoors", "🏠", "Mostly indoors"],
                    ["office", "💻", "Office / School / College"],
                    ["traffic", "🚗", "Around traffic"],
                    ["construction", "🏗️", "Around construction / dust"],
                    ["outdoors", "🌳", "Mostly outdoors"],
                    ["moving", "🔄", "Moving between places"]
                  ] as [Environment, string, string][]).map(([v, ic, lb]) => (
                    <Chip key={v} selected={env === v} onClick={() => setEnv(v)} icon={ic} label={lb} />
                  ))}
                </div>
                <NextBtn disabled={!env} onClick={() => setStep(3)} />
              </div>
            )}

            {step === 3 && (
              <div>
                <StepHeader q="How much time do you usually spend outdoors?" />
                <div className="grid grid-cols-1 gap-2">
                  {([
                    ["<1", "⏱️", "Less than 1 hour"],
                    ["1-3", "🕐", "1 – 3 hours"],
                    ["3-6", "🕒", "3 – 6 hours"],
                    ["6-9", "🕕", "6 – 9 hours"],
                    ["9+", "🌅", "9+ hours"]
                  ] as [OutdoorHours, string, string][]).map(([v, ic, lb]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setHours(v)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left",
                        hours === v
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : "bg-card border-border hover:border-primary/50 hover:bg-muted/50 text-foreground"
                      )}
                    >
                      <span className="text-xl leading-none">{ic}</span>
                      <span>{lb}</span>
                    </button>
                  ))}
                </div>
                <NextBtn disabled={!hours} onClick={() => setStep(4)} />
              </div>
            )}

            {step === 4 && (
              <div>
                <StepHeader q="What are you mainly doing today?" />
                <ChipGrid>
                  {([
                    ["working", "💼", "Working"],
                    ["studying", "🎓", "Studying"],
                    ["travelling", "🚗", "Travelling"],
                    ["exercising", "🏃", "Exercising"],
                    ["home", "🏠", "Staying home"],
                    ["outdoors", "🌳", "Time outdoors"]
                  ] as [TodayActivity, string, string][]).map(([v, ic, lb]) => (
                    <Chip key={v} selected={activity === v} onClick={() => setActivity(v)} icon={ic} label={lb} />
                  ))}
                </ChipGrid>
                <NextBtn disabled={!activity} onClick={() => setStep(5)} />
              </div>
            )}

            {step === 5 && (
              <div>
                <StepHeader q="Want more specific recommendations?" />
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  What best describes your work or study? <em>(Optional — skip to continue)</em>
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {OCCUPATION_OPTIONS.map(occ => (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setOccupation(occ)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all text-left",
                        occupation === occ
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/50 hover:bg-muted/50 text-foreground"
                      )}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => finish(undefined)} className="flex-1 font-semibold text-xs gap-1">
                    <SkipForward className="w-3.5 h-3.5" /> Skip
                  </Button>
                  <Button onClick={() => finish(occupation)} className="flex-[2] font-bold" size="lg">
                    CHECK MY AIR RISK <ShieldCheck className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Result Page ──────────────────────────────────────────────────────────────

function ResultPage({
  profile,
  ward,
  onChangeAnswers
}: {
  profile: Profile;
  ward: any;
  onChangeAnswers: () => void;
}) {
  const aqi: number = ward?.aqi || 150;
  const pm25: number = ward?.pm25 || Math.round(aqi * 0.6);
  const pm10: number = ward?.pm10 || Math.round(aqi * 0.8);
  const no2: number = ward?.no2 || Math.round(aqi * 0.2);
  const wardName: string = ward?.name || "Your Area";
  const dominantPollutant: string = ward?.intelligence_data?.primary_pollutant || (pm25 > 60 ? "PM2.5" : "Dust");
  const predictedAqi: number | null = ward?.intelligence_data?.predicted_aqi || null;

  const [tripType, setTripType] = useState<"office" | "school" | "market" | "park">("office");

  const concern = calcConcernLevel(profile, aqi, pm25);
  const drivers = getDrivers(profile, aqi, dominantPollutant, pm25);
  const matrix = getSafelifeMatrix(profile, aqi);
  const recs = getRecommendations(profile, aqi, dominantPollutant, pm25);
  const activityAdvice = getActivityAdvice(profile.todayActivity, aqi, pm25);
  const homeAdvice = getHomeAdvice(aqi, pm25);
  const route = getRouteMetrics(tripType, aqi);
  const cfg = CONCERN_CONFIG[concern];

  const aqiLabel = aqi > 400 ? "Severe+" : aqi > 300 ? "Severe" : aqi > 200 ? "Very Poor" : aqi > 100 ? "Moderate" : "Good";

  const whyText = (() => {
    const parts: string[] = [];
    if (profile.environment === "traffic" || profile.environment === "moving") parts.push("your environment involves traffic exposure");
    if (profile.environment === "outdoors" || profile.environment === "construction") parts.push("you spend significant time outdoors");
    if (profile.environment === "indoors" || profile.environment === "office") parts.push("you're mostly indoors today");
    const hoursScore = outdoorHoursScore(profile.outdoorHours);
    if (hoursScore >= 4) parts.push("your outdoor exposure time is high");
    if (profile.todayActivity === "exercising") parts.push("today's activity increases your breathing rate");
    if (profile.ageGroup === "u12") parts.push("children are more sensitive to air pollutants");
    if (profile.ageGroup === "60+") parts.push("older adults have higher sensitivity to PM2.5 and NO₂");

    const partsStr = parts.length > 0 ? parts.join(" and ") : "your daily routine";
    return `Given that ${partsStr}, ${dominantPollutant} at current levels is your most relevant exposure concern in ${wardName} today.`;
  })();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="pt-4 border-t border-border/50 space-y-3">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );

  return (
    <Card className="border-primary/20 shadow-md overflow-hidden">
      {/* ── 1. Header ── */}
      <CardHeader className="bg-primary/5 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-sm text-primary font-bold">
            <ShieldCheck className="w-4 h-4" />
            YOUR SAFELIFE RESULT
          </CardTitle>
          <span className="text-[10px] text-muted-foreground font-semibold">{wardName}</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-0">
        {/* ── 2. AQI + Pollutant ── */}
        <div className="flex items-end gap-4 pb-4 border-b border-border/50">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-extrabold mb-0.5">Current AQI</p>
            <p className="text-4xl font-extrabold font-display text-foreground leading-none">{aqi}</p>
            <p className={cn("text-xs font-bold mt-1", cfg.color)}>{aqiLabel}</p>
          </div>
          <div className="space-y-1">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-extrabold">Dominant Pollutant</p>
              <p className="text-sm font-extrabold text-foreground">{dominantPollutant}</p>
            </div>
            <div className="flex gap-2 flex-wrap text-[10px] text-muted-foreground font-semibold">
              <span>PM2.5 {pm25} µg/m³</span>
              <span>·</span>
              <span>PM10 {pm10} µg/m³</span>
              <span>·</span>
              <span>NO₂ {no2} µg/m³</span>
            </div>
          </div>
        </div>

        {/* ── 3. Personal Environmental Concern ── */}
        <div className={cn("my-4 p-4 rounded-xl border", cfg.bg, cfg.border)}>
          <p className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground mb-1">Your Personal Environmental Concern</p>
          <p className={cn("text-2xl font-extrabold", cfg.color)}>{cfg.dot} {concern}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            {concern === "LOW" && "Today's air quality poses a low exposure concern based on your profile."}
            {concern === "MODERATE" && "Moderate exposure concern. Take standard precautions outdoors."}
            {concern === "HIGH" && "High exposure concern based on your environment and today's pollution levels."}
            {concern === "VERY HIGH" && "Very high exposure concern. Take active precautions to reduce outdoor exposure."}
          </p>
        </div>

        {/* ── 4. Why This Matters ── */}
        <Section title="Why This Matters To You">
          <p className="text-xs text-foreground leading-relaxed">{whyText}</p>
          <div className="space-y-1.5 mt-2">
            {drivers.map((d, i) => (
              <div key={i} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold", CONCERN_CONFIG[d.level].bg, CONCERN_CONFIG[d.level].border)}>
                <span>{CONCERN_CONFIG[d.level].dot}</span>
                <span className={CONCERN_CONFIG[d.level].color}>{d.text}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 5. SafeLife Today Matrix ── */}
        <Section title="Your SafeLife Today">
          <div className="grid grid-cols-2 gap-2">
            {matrix.map((item, i) => {
              const c = CONCERN_CONFIG[item.level];
              return (
                <div key={i} className={cn("flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs", c.bg, c.border)}>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>{item.icon}</span> {item.label}
                  </span>
                  <span className={cn("font-extrabold text-[10px]", c.color)}>{item.level}</span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── 6. What Should You Do ── */}
        <Section title="What Should You Do Today?">
          <div className="space-y-2.5">
            {recs.map((rec, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-border/70 bg-muted/30">
                <span className="text-lg leading-none mt-0.5 shrink-0">{rec.icon}</span>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground leading-snug">{i + 1}. {rec.action}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 7. Safer Route ── */}
        <Section title="🧭 Your Safer Route">
          <div className="flex gap-1.5 mb-2.5">
            {(["office", "school", "market", "park"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTripType(t)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all capitalize",
                  tripType === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">🟢 Recommended</p>
                <p className="font-bold text-foreground mt-0.5">{route.greenName}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Lower estimated exposure · ~{route.savingPct}% less than direct route</p>
              </div>
              <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-2 py-0.5 shrink-0 ml-2">AQI {route.greenAqi}</Badge>
            </div>
            <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/30 dark:border-rose-900 flex items-center justify-between text-xs opacity-80">
              <div>
                <p className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider">🔴 Higher Exposure</p>
                <p className="font-semibold text-foreground mt-0.5">{route.directName}</p>
              </div>
              <Badge variant="outline" className="border-rose-300 text-rose-700 font-bold text-xs px-2 py-0.5 shrink-0 ml-2">AQI {route.directAqi}</Badge>
            </div>
          </div>
        </Section>

        {/* ── 8. Activity ── */}
        <Section title={`🏃 Your Activity — ${activityAdvice.label}`}>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{activityAdvice.icon}</span>
              <ActivityStateBadge state={activityAdvice.state} />
            </div>
            <p className="text-xs text-foreground leading-relaxed">{activityAdvice.reason}</p>
            {activityAdvice.alternative && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground font-medium">{activityAdvice.alternative}</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── 9. Home ── */}
        <Section title="🏠 Your Home">
          <div className="space-y-2">
            <div className={cn("p-3 rounded-xl border text-xs", homeAdvice.windowStatus === "OPEN" ? "border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40" : homeAdvice.windowStatus === "TIMED" ? "border-amber-300 bg-amber-50/70 dark:bg-amber-950/40" : "border-rose-300 bg-rose-50/70 dark:bg-rose-950/40")}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-extrabold text-[10px] uppercase tracking-wider text-muted-foreground">Windows</p>
                <Badge variant="outline" className={cn("text-[9px] font-extrabold uppercase border-current px-1.5 py-0", homeAdvice.windowStatus === "OPEN" ? "text-emerald-700 border-emerald-400" : homeAdvice.windowStatus === "TIMED" ? "text-amber-700 border-amber-400" : "text-rose-700 border-rose-400")}>
                  {homeAdvice.windowStatus === "OPEN" ? "OPEN" : homeAdvice.windowStatus === "TIMED" ? "TIMED" : "SEALED"}
                </Badge>
              </div>
              <p className="text-foreground font-semibold leading-snug">{homeAdvice.windowReason}</p>
              {homeAdvice.ventilationPeriod && (
                <p className="text-muted-foreground mt-1">Best ventilation window: <strong>{homeAdvice.ventilationPeriod}</strong></p>
              )}
              {!homeAdvice.ventilationPeriod && (
                <p className="text-muted-foreground mt-1 text-[10px]">Based on outdoor air conditions. No indoor sensor available.</p>
              )}
            </div>
          </div>
        </Section>

        {/* ── 10. If You Need To Go Out ── */}
        <Section title="If You Need To Go Out">
          <div className="space-y-1.5">
            {[
              "Prefer lower-traffic routes and covered walkways over open roadsides.",
              "Reduce unnecessary roadside waiting or lingering near vehicle exhaust.",
              "Take short breaks in cleaner enclosed environments where possible.",
              "Avoid strenuous physical exertion while outdoors.",
              profile.occupation === "Delivery worker" || profile.occupation === "Driver"
                ? "Take protected breaks between outdoor runs — cumulative exposure matters."
                : "If returning indoors, allow time before intensive activity."
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="text-primary font-bold shrink-0 mt-0.5">·</span>
                <span className="leading-snug">{tip}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 11. Personal Alert ── */}
        {predictedAqi && (
          <Section title="🔔 Personal Air Alert">
            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-800 space-y-1.5">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Expected AQI in 24 hours: <span className="text-lg font-extrabold">{predictedAqi}</span>
              </p>
              {predictedAqi > aqi ? (
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
                  Pollution is forecast to increase. {profile.todayActivity === "exercising" || profile.todayActivity === "outdoors" ? "Consider moving outdoor activity to an earlier or later window." : "Take additional precautions if planning outdoor activity tomorrow."}
                </p>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
                  Pollution may ease slightly tomorrow. Continue current precautions until outdoor AQI improves.
                </p>
              )}
            </div>
          </Section>
        )}

        {/* ── Occupation Context ── */}
        {profile.occupation && (
          <Section title={`Personalized for: ${profile.occupation}`}>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {profile.occupation === "Delivery worker" && "Your work involves prolonged outdoor and traffic exposure. The recommendations above prioritize reducing cumulative roadside exposure and taking protected rest breaks."}
              {profile.occupation === "Construction worker" && "Your main exposure concern is likely dust and coarse particulates (PM10). Recommendations focus on reducing dust inhalation and spending time in cleaner areas during breaks."}
              {profile.occupation === "Traffic police" && "Traffic exposure is likely your primary pollution source. Recommendations emphasize reducing unnecessary time at congested intersections and taking protected breaks."}
              {(profile.occupation === "Office / IT" || profile.occupation === "Teacher") && "Your main exposure comes from commuting rather than your workplace. Recommendations prioritize cleaner commute routes and minimising roadside waiting."}
              {profile.occupation === "Student" && "Your main concerns today are school travel and any outdoor activity. Recommendations focus on limiting prolonged outdoor sports during elevated pollution."}
              {profile.occupation === "Driver" && "Drivers face traffic-corridor exposure throughout their shift. Use routes with less idling traffic and take protected breaks in enclosed areas."}
              {!["Delivery worker","Construction worker","Traffic police","Office / IT","Teacher","Student","Driver"].includes(profile.occupation) && "Recommendations above are tailored using your selected environment, outdoor hours, and today's activity alongside current air quality data."}
            </p>
          </Section>
        )}

        {/* ── Disclaimer ── */}
        <div className="pt-4 border-t border-border/40">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            SafeLifePlanner provides environmental exposure guidance based on air-quality conditions and information you've shared. It is not a medical diagnosis or a substitute for professional medical advice.
          </p>
        </div>

        {/* ── 12. Change My Answers ── */}
        <div className="pt-3">
          <Button variant="outline" onClick={onChangeAnswers} className="w-full font-semibold text-xs gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Change My Answers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export function SafeLifePlanner({ ward }: { ward: any }) {
  const [view, setView] = useState<View>("landing");
  const [profile, setProfile] = useState<Profile | null>(null);

  const aqi: number = ward?.aqi || 150;
  const wardName: string = ward?.name || "Selected Ward";

  const handleComplete = (p: Profile) => {
    setProfile(p);
    setView("result");
  };

  return (
    <AnimatePresence mode="wait">
      {view === "landing" && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LandingCard aqi={aqi} onStart={() => setView("onboarding")} />
        </motion.div>
      )}
      {view === "onboarding" && (
        <motion.div key="onboarding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <OnboardingFlow wardName={wardName} onComplete={handleComplete} onBack={() => setView("landing")} />
        </motion.div>
      )}
      {view === "result" && profile && (
        <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ResultPage profile={profile} ward={ward} onChangeAnswers={() => setView("onboarding")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
