import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AqiScoreCardProps {
  title?: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2?: number;
  o3?: number;
  so2?: number;
  className?: string;
}

export function getAqiCategory(aqi: number) {
  if (aqi <= 50) {
    return {
      label: "GOOD",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      description: "Air quality is satisfactory, and air pollution poses little or no risk.",
    };
  } else if (aqi <= 100) {
    return {
      label: "MODERATE",
      color: "text-amber-500",
      bgColor: "bg-amber-500",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
      description: "Air quality is acceptable; acceptable for most people.",
    };
  } else if (aqi <= 150) {
    return {
      label: "POOR",
      color: "text-orange-500",
      bgColor: "bg-orange-500",
      badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
      description: "Members of sensitive groups may experience health effects.",
    };
  } else if (aqi <= 200) {
    return {
      label: "UNHEALTHY",
      color: "text-red-500",
      bgColor: "bg-red-500",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
      description: "Everyone may begin to experience health effects.",
    };
  } else if (aqi <= 300) {
    return {
      label: "SEVERE",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-600",
      badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
      description: "Health alert: everyone may experience more serious health effects.",
    };
  } else {
    return {
      label: "HAZARDOUS",
      color: "text-rose-900 dark:text-rose-400",
      bgColor: "bg-rose-900",
      badgeClass: "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300",
      description: "Health warnings of emergency conditions. Entire population is affected.",
    };
  }
}

export function AqiScoreCard({
  title = "AQI SCORE & CORE METRICS",
  aqi,
  pm25,
  pm10,
  no2,
  o3,
  so2,
  className,
}: AqiScoreCardProps) {
  const category = getAqiCategory(aqi);

  // Position percentage for indicator dot on 0-500 scale
  const dotPercent = Math.min(100, Math.max(0, (aqi / 500) * 100));

  return (
    <Card className={cn("p-6 border-border shadow-sm bg-card rounded-2xl space-y-6", className)}>
      {/* Header Label */}
      <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
        {title}
      </div>

      {/* Score & Status Row */}
      <div className="flex items-baseline gap-4 flex-wrap">
        <span className={cn("text-6xl font-black tracking-tight leading-none", category.color)}>
          {Math.round(aqi)}
        </span>
        <div className="flex flex-col">
          <span className={cn("text-xl font-bold tracking-wide uppercase", category.color)}>
            {category.label}
          </span>
          <span className="text-xs text-muted-foreground font-medium">(US-AQI standard)</span>
        </div>
      </div>

      {/* Multi-Color AQI Scale Bar */}
      <div className="space-y-2 pt-1">
        <div className="relative w-full h-3 rounded-full">
          {/* Continuous gradient background bar */}
          <div
            className="w-full h-full rounded-full"
            style={{
              background:
                "linear-gradient(to right, #22c55e 0%, #22c55e 10%, #eab308 20%, #f97316 30%, #ef4444 40%, #a855f7 60%, #7e1d1d 100%)",
            }}
          />

          {/* Dynamic Dot Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-slate-950 border-2 border-white rounded-full shadow-lg transition-all duration-500"
            style={{ left: `${dotPercent}%` }}
          />
        </div>

        {/* Scale Ticks */}
        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-0.5 pt-0.5">
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
          <span>300</span>
          <span>500</span>
        </div>
      </div>

      {/* Scale Legend Key */}
      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-xs text-muted-foreground font-medium pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block" />
          <span>Good (0–50)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] inline-block" />
          <span>Moderate (51–100)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] inline-block" />
          <span>Poor (101–150)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block" />
          <span>Unhealthy (151–200)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7] inline-block" />
          <span>Severe (201–300)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7e1d1d] inline-block" />
          <span>Hazardous (301+)</span>
        </div>
      </div>

      {/* Sub-Metrics Row (PM2.5, PM10, NO2, O3) — NO CO2 BUDGET */}
      <div className="pt-3 border-t border-border/60 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* PM2.5 */}
        <div className="space-y-0.5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">PM2.5</div>
          <div className="text-xl font-bold text-foreground">
            {pm25} <span className="text-xs font-normal text-muted-foreground">µg/m³</span>
          </div>
        </div>

        {/* PM10 */}
        <div className="space-y-0.5 md:border-l md:border-border/60 md:pl-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">PM10</div>
          <div className="text-xl font-bold text-foreground">
            {pm10} <span className="text-xs font-normal text-muted-foreground">µg/m³</span>
          </div>
        </div>

        {/* NO2 */}
        {no2 !== undefined && (
          <div className="space-y-0.5 md:border-l md:border-border/60 md:pl-4">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">NO2</div>
            <div className="text-xl font-bold text-foreground">
              {no2} <span className="text-xs font-normal text-muted-foreground">ppb</span>
            </div>
          </div>
        )}

        {/* O3 / SO2 */}
        {(o3 !== undefined || so2 !== undefined) && (
          <div className="space-y-0.5 md:border-l md:border-border/60 md:pl-4">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {o3 !== undefined ? "OZONE (O3)" : "SO2"}
            </div>
            <div className="text-xl font-bold text-foreground">
              {o3 !== undefined ? o3 : so2} <span className="text-xs font-normal text-muted-foreground">ppb</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
