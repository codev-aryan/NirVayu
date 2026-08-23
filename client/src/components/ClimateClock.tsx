import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export function ClimateClock({ className }: { className?: string }) {
  const { t } = useLanguage();
  // Mock climate clock: Years, Days, HH:MM:SS
  const [time, setTime] = useState({ years: 4, days: 302, hours: 14, mins: 22, secs: 40 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => {
        let { years, days, hours, mins, secs } = prev;
        secs--;
        if (secs < 0) { secs = 59; mins--; }
        if (mins < 0) { mins = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) { days = 364; years--; }
        return { years, days, hours, mins, secs };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn("flex flex-col bg-black text-white p-4 rounded-2xl shadow-2xl border border-gray-800 min-w-[320px]", className)}>
      <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2 font-bold flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <Clock className="w-3 h-3 text-red-500" />
        </div>
        {t("home.clock.caption")}
      </div>
      <div className="flex items-baseline gap-3 font-mono">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-bold">{time.years}</span>
          <span className="text-sm text-gray-500 font-bold">{t("home.clock.yrs")}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-bold tracking-tighter">
            {String(time.days).padStart(3, '0')}
          </span>
          <span className="text-sm text-gray-500 font-bold">{t("home.clock.days")}</span>
        </div>
        <div className="text-3xl md:text-4xl font-bold text-red-500 ml-auto tabular-nums">
          {String(time.hours).padStart(2, '0')}:{String(time.mins).padStart(2, '0')}:{String(time.secs).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
