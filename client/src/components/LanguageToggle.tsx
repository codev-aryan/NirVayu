import React from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  variant?: "default" | "compact" | "pill";
}

export function LanguageToggle({ className, variant = "default" }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage(language === "en" ? "hi" : "en")}
        className={cn("h-8 px-2 font-medium text-xs flex items-center gap-1.5", className)}
        title={t("lang.toggle")}
      >
        <Languages className="w-3.5 h-3.5" />
        <span>{language === "en" ? "हिन्दी" : "EN"}</span>
      </Button>
    );
  }

  return (
    <div className={cn("inline-flex items-center p-0.5 rounded-lg bg-muted/80 border border-border/80 shadow-sm", className)}>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
          language === "en"
            ? "bg-background text-foreground shadow-xs font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        className={cn(
          "px-2.5 py-1 text-xs font-semibold rounded-md transition-all",
          language === "hi"
            ? "bg-background text-foreground shadow-xs font-bold"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        हिन्दी
      </button>
    </div>
  );
}
