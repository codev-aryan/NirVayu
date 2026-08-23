import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface StatusBadgeProps {
  aqi: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ aqi, className, size = "md" }: StatusBadgeProps) {
  const { t } = useLanguage();

  const getStatus = (val: number) => {
    if (val <= 50) return { label: t("status.good"), color: "bg-green-100 text-green-700 border-green-200" };
    if (val <= 100) return { label: t("status.moderate"), color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    if (val <= 200) return { label: t("status.unhealthy"), color: "bg-orange-100 text-orange-700 border-orange-200" };
    if (val <= 300) return { label: t("status.veryUnhealthy"), color: "bg-red-100 text-red-700 border-red-200" };
    return { label: t("status.hazardous"), color: "bg-purple-100 text-purple-700 border-purple-200" };
  };

  const status = getStatus(aqi);
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center font-medium rounded-full border",
      status.color,
      sizeClasses[size],
      className
    )}>
      AQI {aqi} • {status.label}
    </span>
  );
}
