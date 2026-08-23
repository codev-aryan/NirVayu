import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, AlertTriangle, Wind, Users, Loader2,
  CheckCircle2, Thermometer, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";

interface WardMeasuresData {
  measures: string[];
  riskLevel: "low" | "moderate" | "high" | "very high" | "severe";
  outdoorAdvice: string;
  sensitiveGroups: string;
  ward: string;
  aqi: number;
  aqiCategory: string;
  dominantSource: string;
  generatedAt: string;
}

interface WardMeasuresProps {
  wardId: number;
  wardName: string;
}

const getRiskConfig = (isHindi: boolean): Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> => ({
  low:       { color: "text-green-700 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20",  border: "border-green-200 dark:border-green-800",  icon: <CheckCircle2 className="w-4 h-4" />, label: isHindi ? "कम जोखिम (Low Risk)" : "Low Risk" },
  moderate:  { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20",border: "border-yellow-200 dark:border-yellow-800",icon: <Eye className="w-4 h-4" />,          label: isHindi ? "मध्यम जोखिम (Moderate Risk)" : "Moderate Risk" },
  high:      { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20",border: "border-orange-200 dark:border-orange-800",icon: <AlertTriangle className="w-4 h-4" />, label: isHindi ? "उच्च जोखिम (High Risk)" : "High Risk" },
  "very high": { color: "text-red-700 dark:text-red-400",  bg: "bg-red-50 dark:bg-red-900/20",      border: "border-red-200 dark:border-red-800",      icon: <AlertTriangle className="w-4 h-4" />, label: isHindi ? "अत्यधिक जोखिम (Very High Risk)" : "Very High Risk" },
  severe:    { color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20",border: "border-purple-200 dark:border-purple-800",icon: <Thermometer className="w-4 h-4" />,  label: isHindi ? "गंभीर जोखिम (Severe Risk)" : "Severe Risk" },
});

export function WardMeasures({ wardId, wardName }: WardMeasuresProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [data, setData] = useState<WardMeasuresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setData(null);

    fetch(`/api/ward-bulletin?wardId=${wardId}&language=${language}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError(isHindi ? "वार्ड जानकारी लोड करने में विफल।" : "Failed to load ward insights."))
      .finally(() => setLoading(false));
  }, [wardId, language]);

  const riskMap = getRiskConfig(isHindi);
  const risk = data ? (riskMap[data.riskLevel] || riskMap["moderate"]) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm"
      id="ward-measures-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {isHindi ? `वार्ड सलाह व जानकारी — ${wardName}` : `Ward Insights — ${wardName}`}
          </span>
        </div>
        {data && risk && (
          <Badge
            variant="outline"
            className={cn("text-[11px] gap-1 capitalize", risk.color, risk.border, risk.bg)}
          >
            {risk.icon}
            {risk.label}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isHindi ? `${wardName} के हवा के आंकड़ों का विश्लेषण किया जा रहा है...` : `Analyzing ${wardName} air quality data…`}
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : data ? (
          <div className="space-y-4">
            {/* Outdoor advice */}
            <div className={cn("rounded-lg px-3 py-2.5 flex items-start gap-2 text-sm border", risk?.bg, risk?.border, risk?.color)}>
              <Wind className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-snug font-medium">{data.outdoorAdvice}</p>
            </div>

            {/* Preventive Measures */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {isHindi ? `बचाव के उपाय · ${data.dominantSource}` : `Preventive Measures · ${data.dominantSource}`}
              </p>
              <ul className="space-y-2">
                {data.measures.map((measure, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground/80 leading-snug">{measure}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Sensitive groups */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-2 bg-muted/20">
              <Users className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-500" />
              <span>
                <strong className="text-foreground/70">
                  {isHindi ? "उच्च जोखिम समूह: " : "At-risk groups: "}
                </strong>
                {data.sensitiveGroups}
              </span>
            </div>

            <p className="text-[10px] text-muted-foreground">
              {isHindi
                ? `✦ AI द्वारा लाइव AQI + PM2.5 + प्रदूषण स्रोत विश्लेषण · अपडेट समय ${new Date(data.generatedAt).toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" })}`
                : `✦ Gemini analyzed live AQI + PM2.5 + source data · Updated ${new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
