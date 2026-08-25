import React, { useState } from "react";
const BERKELEY_EARTH_SOURCE = "https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Cigarette, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface CigaretteHealthRiskCardProps {
  wardName?: string;
  aqi: number;
  pm25: number;
  dominantSource?: string;
  className?: string;
}

interface ConditionMeta {
  id: string;
  name: string;
  minAqi: number; // Only show this tab if current AQI >= minAqi
}

const CONDITION_METAS: ConditionMeta[] = [
  { id: "headaches", name: "Headaches", minAqi: 0 },
  { id: "eye-irritation", name: "Eye Irritation", minAqi: 40 },
  { id: "asthma", name: "Asthma", minAqi: 50 },
  { id: "allergies-sinus", name: "Allergies & Sinus", minAqi: 45 },
  { id: "pregnancy", name: "Pregnancy", minAqi: 75 },
  { id: "heart-issues", name: "Heart Issues", minAqi: 110 },
  { id: "cold-flu", name: "Cold / Flu", minAqi: 90 },
  { id: "copd", name: "Chronic COPD", minAqi: 130 }
];

export function getRiskLevel(aqi: number, conditionId: string) {
  // Baseline thresholds per condition
  let highThreshold = 150;
  let criticalThreshold = 250;

  if (conditionId === "copd" || conditionId === "heart-issues") {
    highThreshold = 120;
    criticalThreshold = 200;
  } else if (conditionId === "asthma" || conditionId === "pregnancy") {
    highThreshold = 140;
    criticalThreshold = 220;
  }

  if (aqi <= 50) {
    return {
      label: "LOW",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300",
      bgBoxClass: "bg-emerald-50/60 dark:bg-emerald-950/20",
      borderClass: "border-emerald-200 dark:border-emerald-900/40"
    };
  } else if (aqi <= highThreshold) {
    return {
      label: "MODERATE",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
      bgBoxClass: "bg-amber-50/60 dark:bg-amber-950/20",
      borderClass: "border-amber-200 dark:border-amber-900/40"
    };
  } else if (aqi <= criticalThreshold) {
    return {
      label: "HIGH",
      badgeClass: "bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
      bgBoxClass: "bg-rose-50/60 dark:bg-rose-950/20",
      borderClass: "border-rose-200 dark:border-rose-900/40"
    };
  } else {
    return {
      label: "CRITICAL",
      badgeClass: "bg-purple-200 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200",
      bgBoxClass: "bg-purple-50/60 dark:bg-purple-950/20",
      borderClass: "border-purple-200 dark:border-purple-900/40"
    };
  }
}

export function getDynamicSymptoms(aqi: number, conditionId: string): string {
  if (aqi <= 75) {
    switch (conditionId) {
      case "headaches": return "Mild forehead pressure or light fatigue during peak commute hours.";
      case "eye-irritation": return "Occasional eye dryness or mild watering when outdoors.";
      case "asthma": return "Slight throat tickle or mild exertion breathlessness.";
      default: return "Minor throat dryness or temporary fatigue during prolonged outdoor activity.";
    }
  } else if (aqi <= 180) {
    switch (conditionId) {
      case "headaches": return "Tight, band-like pressure across forehead and temples, sensitivity to strong odors, sluggishness, and trouble focusing.";
      case "eye-irritation": return "Burning sensation, redness, watery eyes, and itchiness caused by airborne dust and chemical irritants.";
      case "asthma": return "Wheezing, chest tightness, shortness of breath, persistent dry cough, and rapid shallow breathing.";
      case "allergies-sinus": return "Frequent sneezing, nasal congestion, post-nasal drip, sinus head pressure, and throat tickle.";
      case "pregnancy": return "Systemic inflammatory stress, reduced stamina, elevated heart rate, and mild shortness of breath.";
      case "heart-issues": return "Elevated resting pulse, mild chest tightness, palpitations, and vascular fatigue.";
      case "cold-flu": return "Raw sore throat, dry hacking cough, hoarseness, and heightened vulnerability to respiratory viruses.";
      case "copd": return "Persistent breathlessness, coughing with phlegm, fatigue, and low oxygen saturation.";
      default: return "Respiratory discomfort, eye irritation, and general fatigue.";
    }
  } else {
    // Severe / Hazardous AQI > 180
    switch (conditionId) {
      case "headaches": return "Throbbing migraine-like head pressure, severe light and noise sensitivity, nausea, and disorientation from toxic PM2.5 & CO inhalation.";
      case "eye-irritation": return "Severe conjunctival redness, intense stinging, excessive tearing, and blurry vision due to heavy particulate friction.";
      case "asthma": return "Acute asthma exacerbation, severe chest constriction, violent coughing spells, and respiratory distress.";
      case "allergies-sinus": return "Severe sinus pain, nasal obstruction, inflamed throat mucosa, and persistent coughing.";
      case "pregnancy": return "Placental oxygen reduction risk, severe systemic oxidative stress, and blood pressure spikes.";
      case "heart-issues": return "High cardiovascular risk, severe blood pressure spikes, arrhythmia risk, and chest pain.";
      case "cold-flu": return "Severe bronchospasm, persistent feverish fatigue, raw chest pain, and secondary infection risks.";
      case "copd": return "Critical COPD flare-up, severe hypoxemia, gasping for breath, and urgent hospitalization risk.";
      default: return "Severe respiratory distress and acute vascular stress.";
    }
  }
}

export function getDynamicDos(aqi: number, source: string, wardName?: string, conditionId?: string): string[] {
  const locStr = wardName ? wardName : "your area";
  const dosList: string[] = [];

  // Base Do 1
  dosList.push(`Choose indoors with clean indoor air in ${locStr} whenever pollution levels climb.`);

  // Source-specific Do 2
  if (source === "Traffic") {
    dosList.push(`Avoid major vehicular corridors in ${locStr} during peak rush hours (8-10 AM & 6-9 PM).`);
  } else if (source === "Construction") {
    dosList.push(`Keep doors and windows sealed in ${locStr} to block coarse silica dust (PM10) from nearby excavation.`);
  } else if (source === "Industrial Emissions") {
    dosList.push(`Use air purifiers equipped with activated carbon filters to neutralize toxic chemical gases (SO2/NO2) in ${locStr}.`);
  } else if (source === "Waste Burning") {
    dosList.push(`Report open trash/plastic fires in ${locStr} immediately and stay indoors downwind.`);
  } else {
    dosList.push(`Run HEPA air filtration indoors in ${locStr} to trap fine airborne particles.`);
  }

  // Condition-specific Do 3
  if (conditionId === "headaches") {
    dosList.push("Stay hydrated throughout the day and take short breaks from screens or harsh lights if migraines hit easily.");
  } else if (conditionId === "eye-irritation") {
    dosList.push("Use lubricating eye drops (artificial tears) to flush out fine particulate dust upon returning home.");
  } else if (conditionId === "asthma") {
    dosList.push("Keep your quick-relief rescue inhaler (salbutamol) accessible at all times.");
  } else if (conditionId === "allergies-sinus") {
    dosList.push("Use saline nasal sprays or neti pots to cleanse nasal passages after stepping outside.");
  } else if (conditionId === "pregnancy") {
    dosList.push("Maintain high intake of antioxidant-rich foods and wear an N95 mask during transit.");
  } else if (conditionId === "heart-issues") {
    dosList.push("Adhere strictly to prescribed cardiac medication and monitor blood pressure regularly.");
  } else {
    dosList.push("Sip warm herbal water (ginger/tulsi) to soothe respiratory tract inflammation.");
  }

  return dosList;
}

export function getDynamicDonts(aqi: number, source: string, wardName?: string, conditionId?: string): string[] {
  const dontsList: string[] = [];

  // Base Don't 1
  if (aqi > 150) {
    dontsList.push(`Do not attempt demanding outdoor exercise or running in ${wardName || 'Delhi'} while AQI is ${Math.round(aqi)}.`);
  } else {
    dontsList.push(`Avoid prolonged outdoor physical exertion during hazy morning hours in ${wardName || 'Delhi'}.`);
  }

  // Source-specific Don't 2
  if (source === "Traffic") {
    dontsList.push(`Don't roll down car windows or walk near congested traffic intersections without an N95 mask.`);
  } else if (source === "Construction") {
    dontsList.push(`Don't dry laundry outside near unpaved roads where heavy construction dust settles on fabrics.`);
  } else if (source === "Industrial Emissions") {
    dontsList.push(`Don't ventilate home during night hours when industrial smoke plumes settle near ground level.`);
  } else {
    dontsList.push(`Don't burn incense, candles, or mosquito coils indoors which compound PM2.5 levels.`);
  }

  return dontsList;
}

export function CigaretteHealthRiskCard({
  wardName,
  aqi,
  pm25,
  dominantSource = "Traffic",
  className
}: CigaretteHealthRiskCardProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  // Cigarette Equivalent Math (1 cigarette ≈ 22 µg/m³ PM2.5 per day)
  const dailyCigarettes = Math.max(0.2, Math.round((pm25 / 22) * 10) / 10);
  const weeklyCigarettes = Math.round(dailyCigarettes * 7 * 10) / 10;
  const monthlyCigarettes = Math.round(dailyCigarettes * 30);

  // Dynamic Filtering: Only show conditions that are applicable/active for current AQI
  const activeConditions = CONDITION_METAS.filter(c => aqi >= c.minAqi);

  const [selectedConditionId, setSelectedConditionId] = useState<string>(
    activeConditions[0]?.id || "headaches"
  );

  const currentMeta =
    activeConditions.find(c => c.id === selectedConditionId) || activeConditions[0] || CONDITION_METAS[0];

  const conditionHindiNames: Record<string, string> = {
    "headaches": "सिरदर्द",
    "eye-irritation": "आंखों में जलन",
    "asthma": "अस्थमा / दमा",
    "allergies-sinus": "एलर्जी व साइनस",
    "pregnancy": "गर्भावस्था",
    "heart-issues": "हृदय समस्या",
    "cold-flu": "सर्दी / जुकाम",
    "copd": "सीओपीडी (COPD)"
  };

  const risk = getRiskLevel(aqi, currentMeta.id);

  const getRiskLabelHi = (lbl: string) => {
    switch(lbl) {
      case "LOW": return "कम जोखिम (LOW)";
      case "MODERATE": return "मध्यम जोखिम (MODERATE)";
      case "HIGH": return "उच्च जोखिम (HIGH)";
      default: return "गंभीर जोखिम (CRITICAL)";
    }
  };

  const symptomsTextHi: Record<string, string> = {
    "headaches": "माथे और कनपटी पर भारीपन, सिरदर्द, धुएं और गंध से संवेदनशीलता व ध्यान लगाने में कठिनाई।",
    "eye-irritation": "आंखों में लालपन, जलन, पानी आना और हवा में मौजूद धूल कणों से आंखों की परेशानी।",
    "asthma": "सांस फूलना, सीने में जकड़न, सूखी खांसी और तेज-तेज सांस चलना।",
    "allergies-sinus": "बार-बार छींकें, नाक बंद होना, गले में खराश और साइनस का दबाव।",
    "pregnancy": "थकान, सांस लेने में हल्की तकलीफ और रक्तचाप में उतार-चढ़ाव।",
    "heart-issues": "दिल की धड़कन तेज होना, सीने में भारीपन और थकान।",
    "cold-flu": "गले में खराश, सूखी खांसी और सांस की नली में सूजन।",
    "copd": "सांस लेने में अत्यधिक कठिनाई, बलगम वाली खांसी और थकान।"
  };

  const symptomsText = isHindi 
    ? (symptomsTextHi[currentMeta.id] || "सांस की नली में जलन और थकान।")
    : getDynamicSymptoms(aqi, currentMeta.id);

  const rawDos = getDynamicDos(aqi, dominantSource, wardName, currentMeta.id);
  const rawDonts = getDynamicDonts(aqi, dominantSource, wardName, currentMeta.id);

  const dosList = isHindi ? [
    `जब भी ${wardName || 'आपके इलाके'} में प्रदूषण बढ़े, घर के अंदर साफ हवा में रहें।`,
    dominantSource === "Traffic" ? `${wardName || 'क्षेत्र'} के मुख्य व्यस्त रास्तों से व्यस्त घंटों (सुबह 8-10 और शाम 6-9) में बचें।` :
    dominantSource === "Construction" ? `${wardName || 'क्षेत्र'} में निर्माण की धूल से बचने के लिए खिड़कियां व दरवाजे बंद रखें।` :
    `प्रदूषित हवा से बचने के लिए HEPA एयर प्यूरीफायर या इनडोर पौधों का इस्तेमाल करें।`,
    currentMeta.id === "asthma" ? "अपना आपातकालीन इनहेलर हमेशा अपने पास रखें।" :
    currentMeta.id === "eye-irritation" ? "बाहर से आने के बाद आंखों को साफ पानी से धोएं।" :
    "गले की सूजन कम करने के लिए गुनगुना पानी या तुलसी की चाय पीएं।"
  ] : rawDos;

  const dontsList = isHindi ? [
    `AQI ${Math.round(aqi)} होने पर ${wardName || 'दिल्ली'} में बाहर भारी व्यायाम या दौड़ने से बचें।`,
    dominantSource === "Traffic" ? "बिना N95 मास्क के गाड़ियों के धुएं वाले ट्रैफिक में बाहर न घूमें।" :
    "घर के अंदर अगरबत्ती, मोमबत्ती या कछुआ छाप न जलाएं जिससे PM2.5 बढ़ता है।"
  ] : rawDonts;

  const getAqiStageText = (val: number) => {
    if (val <= 50) return isHindi ? "अच्छा" : "Good";
    if (val <= 100) return isHindi ? "मध्यम" : "Moderate";
    if (val <= 150) return isHindi ? "खराब" : "Poor";
    if (val <= 200) return isHindi ? "अस्वास्थ्यकर" : "Unhealthy";
    if (val <= 300) return isHindi ? "गंभीर" : "Severe";
    return isHindi ? "अत्यधिक गंभीर" : "Hazardous";
  };

  return (
    <Card className={cn("p-6 border-border/60 shadow-sm bg-card rounded-2xl space-y-6", className)}>
      {/* ─── TOP SECTION: CIGARETTE EQUIVALENT ─── */}
      <div className="space-y-4 pb-6 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cigarette className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              {isHindi ? "सिगरेट धुआं समानता (स्वास्थ्य जोखिम)" : "CIGARETTE EQUIVALENT"}
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-600 dark:text-amber-400">
            Berkeley Earth Standard
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Equivalent */}
          <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
            <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              {isHindi ? "दैनिक सिगरेट समानता" : "DAILY EQUIVALENT"}
            </div>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-400">
              {dailyCigarettes} <span className="text-sm font-semibold text-muted-foreground">{isHindi ? "सिगरेट/दिन" : "per day"}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1">
              {isHindi ? `${wardName || "दिल्ली"} की हवा में 24 घंटे सांस लेने का फेफड़ों पर असर` : `Equates to breathing local air ${wardName ? `in ${wardName}` : "across Delhi"}`}
            </p>
          </div>

          {/* Weekly Exposure */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              {isHindi ? "साप्ताहिक जोखिम" : "WEEKLY EXPOSURE"}
            </div>
            <div className="text-3xl font-bold text-foreground">
              {weeklyCigarettes} <span className="text-sm font-normal text-muted-foreground">{isHindi ? "सिगरेट" : "cigarettes"}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1 flex items-center gap-1">
              <a
                href={BERKELEY_EARTH_SOURCE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                <span>{isHindi ? "गणना का सूत्र" : "Source Formula"}</span>
                <Info className="w-3 h-3 inline" />
              </a>
            </p>
          </div>

          {/* Monthly Exposure */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              {isHindi ? "मासिक कुल जोखिम" : "MONTHLY EXPOSURE"}
            </div>
            <div className="text-3xl font-bold text-foreground">
              {monthlyCigarettes} <span className="text-sm font-normal text-muted-foreground">{isHindi ? "सिगरेट" : "cigarettes"}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1">
              {isHindi ? "30 दिनों में विषैले कणों का कुल प्रभाव" : "Cumulative 30-day toxicity load"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM SECTION: RISK ASSESSMENTS — PREVENT HEALTH PROBLEMS ─── */}
      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">
            {isHindi ? "स्वास्थ्य जोखिम मूल्यांकन" : "RISK ASSESSMENTS"}
          </div>
          <h2 className="text-xl font-bold font-display text-foreground mt-0.5">
            {isHindi ? `बीमारियों से बचाव की सलाह ${wardName ? `— ${wardName}` : ""}` : `Prevent Health Problems ${wardName ? `— ${wardName}` : ""}`}
          </h2>
        </div>

        {/* Dynamic Condition Tabs (Filtered ward-wise by current AQI) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {activeConditions.map((condition) => {
            const isSelected = condition.id === currentMeta.id;
            const displayName = isHindi ? (conditionHindiNames[condition.id] || condition.name) : condition.name;
            return (
              <button
                key={condition.id}
                onClick={() => setSelectedConditionId(condition.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border",
                  isSelected
                    ? "border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold shadow-sm"
                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                )}
              >
                {displayName}
              </button>
            );
          })}
        </div>

        {/* Selected Condition Risk Card Box */}
        <div className={cn("p-6 rounded-2xl border space-y-6 transition-all", risk.bgBoxClass, risk.borderClass)}>
          {/* Risk Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Badge className={cn("px-2.5 py-0.5 font-extrabold text-[10px] tracking-wider uppercase rounded-md", risk.badgeClass)}>
                {isHindi ? getRiskLabelHi(risk.label) : `${risk.label} RISK`}
              </Badge>
              <h3 className="text-lg font-bold text-foreground">
                {isHindi ? (conditionHindiNames[currentMeta.id] || currentMeta.name) : currentMeta.name}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1">
              {isHindi ? (
                <>जोखिम स्तर <strong>{getRiskLabelHi(risk.label)}</strong> है ({getAqiStageText(aqi)} हवा, AQI {Math.round(aqi)} {wardName ? `${wardName} में` : ""})। मुख्य कारण: <strong>{dominantSource}</strong></>
              ) : (
                <>Risk is <strong>{risk.label}</strong> for {getAqiStageText(aqi)} conditions (AQI {Math.round(aqi)} {wardName ? `in ${wardName}` : ""}). Primary pollution driver: <strong>{dominantSource}</strong>.</>
              )}
            </p>
          </div>

          {/* Common Symptoms */}
          <div className="space-y-1">
            <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              {isHindi ? "सामान्य लक्षण" : "COMMON SYMPTOMS"}
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-normal">
              {isHindi ? "संभावित लक्षण: " : "Some people experience: "}{symptomsText}
            </p>
          </div>

          {/* Do's & Don'ts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/40">
            {/* DO'S Column */}
            <div className="space-y-3">
              <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>{isHindi ? "क्या करें (DO'S)" : "DO'S"}</span>
              </div>
              <ul className="space-y-2.5">
                {dosList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-normal">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DON'TS Column */}
            <div className="space-y-3">
              <div className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>{isHindi ? "क्या न करें (DON'TS)" : "DON'TS"}</span>
              </div>
              <ul className="space-y-2.5">
                {dontsList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-normal">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
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
