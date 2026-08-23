import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ExternalLink, Radio, ChevronLeft, ChevronRight, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface Article {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface NewsBulletinProps {
  zone?: string;
}

export function NewsBulletin({ zone }: NewsBulletinProps) {
  const { t } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 3600) {
      return t("news.agoMinutes", { m: Math.floor(diff / 60) });
    }
    if (diff < 86400) {
      return t("news.agoHours", { h: Math.floor(diff / 3600) });
    }
    return t("news.agoDays", { d: Math.floor(diff / 86400) });
  };

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError("");
      try {
        const params = zone ? `?zone=${encodeURIComponent(zone)}` : "";
        const res = await fetch(`/api/news${params}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Failed to load news.");
          setArticles([]);
        } else {
          setArticles(data.articles || []);
          setCurrent(0);
        }
      } catch {
        setError("Unable to connect to news service.");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [zone]);

  // Auto-advance ticker every 5 seconds
  useEffect(() => {
    if (!paused && articles.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % articles.length);
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, articles.length]);

  const prev = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent((c) => (c - 1 + articles.length) % articles.length);
  };

  const next = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent((c) => (c + 1) % articles.length);
  };

  const zoneDisplayName = zone || "Delhi";

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/60 overflow-hidden",
        "bg-gradient-to-r from-slate-900/5 via-background to-slate-900/5 dark:from-slate-800/30 dark:via-background dark:to-slate-800/30"
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      id="news-ticker"
    >
      <div className="flex items-stretch h-11">
        {/* Label badge */}
        <div className="flex items-center gap-1.5 px-3 bg-red-600 text-white shrink-0">
          <Radio className="w-3 h-3 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
            {zone ? t("news.zoneLabel", { zone: zoneDisplayName }) : t("news.label")}
          </span>
        </div>

        {/* Divider */}
        <div className="w-[1px] bg-border/60 shrink-0" />

        {/* Ticker content */}
        <div className="flex-1 overflow-hidden flex items-center px-3 relative">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("news.loading", { zone: zoneDisplayName })}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          ) : articles.length === 0 ? (
            <span className="text-xs text-muted-foreground">{t("news.notFound", { zone: zoneDisplayName })}</span>
          ) : (
            <AnimatePresence mode="wait">
              <motion.a
                key={current}
                href={articles[current].url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 group w-full min-w-0 text-xs hover:text-primary transition-colors"
              >
                <Newspaper className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="font-medium truncate flex-1">{articles[current].title}</span>
                <span className="text-muted-foreground shrink-0 hidden sm:inline">
                  {articles[current].source} · {formatTimeAgo(articles[current].publishedAt)}
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
              </motion.a>
            </AnimatePresence>
          )}
        </div>

        {/* Navigation */}
        {articles.length > 1 && (
          <div className="flex items-center border-l border-border/60 shrink-0">
            <button
              onClick={prev}
              className="h-full px-2.5 hover:bg-muted transition-colors flex items-center text-muted-foreground hover:text-foreground"
              aria-label="Previous news"
              id="news-prev-btn"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-muted-foreground px-1 tabular-nums">
              {current + 1}/{articles.length}
            </span>
            <button
              onClick={next}
              className="h-full px-2.5 hover:bg-muted transition-colors flex items-center text-muted-foreground hover:text-foreground"
              aria-label="Next news"
              id="news-next-btn"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!loading && !error && articles.length > 1 && !paused && (
        <motion.div
          key={current}
          className="h-[2px] bg-red-500"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
        />
      )}
    </div>
  );
}
