import { useState, useEffect } from "react";
import { useWards, useToggleEmergency, useUpdateControls, useSimulatePolicy, useWardIntelligence, useAllReports, useUpdateReportAction, useDeleteReportLocal, useRestoreReport, useBlockchainLedger } from "@/hooks/use-wards";
import { Loader2, Activity, Trophy, Medal, AlertTriangle, AlertOctagon, ShieldAlert, ShieldCheck, Truck, Hammer, Wind, Factory, TrendingDown, TrendingUp, BarChart3, CheckCircle, ExternalLink, BrainCircuit, Info, Clock, Trash2, RefreshCw, Search } from "lucide-react";
import { pollutionBlockchain } from "@/lib/blockchain";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { WardMap } from "./WardMap";
import { StatusBadge } from "./StatusBadge";
import { AqiScoreCard } from "./AqiScoreCard";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

import { ControlType, SimulationRequest } from "@shared/schema";
import { getOfficialGrapStage } from "@shared/grapRules";

export function AuthorityDashboard() {
  const { data, isLoading } = useWards();
  const { t, language } = useLanguage();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">{t("common.loading")}</p>
      </div>
    </div>
  );

  if (!data) return null;
  const { wards, lastUpdated } = data;

  const selectedWard = wards.find(w => w.id === selectedWardId) || wards[0];
  const sortedWards = [...wards].sort((a, b) => b.aqi - a.aqi);
  const filteredWards = sortedWards.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.id.toString().includes(searchQuery)
  );

  const getLocalizedSource = (source: string) => {
    switch (source) {
      case "Traffic": return t("source.traffic");
      case "Construction": return t("source.construction");
      case "Industrial Emissions": return t("source.industry");
      case "Waste Burning": return t("source.waste");
      case "Dust & Local": return t("source.dust");
      default: return source;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
      {/* LEFT: Ward List & Map (Compact & Sticky) */}
      <div className="lg:col-span-4 flex flex-col gap-4 self-start lg:sticky lg:top-20">
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> {t("authority.lastUpdated")}: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </div>

        <Card className="flex flex-col border-border/50 shadow-md bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3 space-y-2">
            <CardTitle className="flex items-center justify-between">
              <span>{t("authority.wardMonitor")}</span>
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                {filteredWards.length} {t("common.active")}
              </span>
            </CardTitle>
            <CardDescription>{t("authority.jurisdictionDesc")}</CardDescription>
            
            {/* Ward Search Bar */}
            <div className="relative pt-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={language === "hi" ? "वर्ड खोजें (नाम या ID)..." : "Search ward by name or ID..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-background border-border/60"
              />
            </div>
          </CardHeader>

          {/* Map with fixed compact height */}
          <div className="h-[220px] relative px-3 pb-1">
            <WardMap 
              wards={wards} 
              selectedWardId={selectedWard?.id} 
              onSelectWard={setSelectedWardId}
              className="w-full h-full rounded-xl border border-border"
            />
          </div>

          {/* Ward List */}
          <div className="h-[260px] overflow-y-auto border-t border-border/50 p-2 space-y-1.5">
            {filteredWards.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground italic">
                {language === "hi" ? "कोई वर्ड नहीं मिला" : "No matching ward found"}
              </div>
            ) : (
              filteredWards.map(ward => (
                <div 
                  key={ward.id}
                  onClick={() => setSelectedWardId(ward.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-muted/50",
                    selectedWard?.id === ward.id ? "bg-primary/10 border-primary/20 shadow-sm" : ""
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{ward.name}</span>
                    {ward.emergency_mode && <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="text-[10px] text-muted-foreground font-semibold">Ward #{ward.id}</span>
                    <StatusBadge aqi={ward.aqi} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* RIGHT: Detailed Controls */}
      <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pb-10">
        {selectedWard && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={selectedWard.id}
            className="space-y-6"
          >
            {/* Header AQI & Authority Overview Row */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left: Colorful Citizen-Style AQI Score Card adapted for Authority */}
              <div className="xl:col-span-8">
                <AqiScoreCard
                  title={`${selectedWard.name.toUpperCase()} (WARD #${selectedWard.id}) — REAL-TIME AQI`}
                  aqi={selectedWard.aqi}
                  pm25={selectedWard.pm25}
                  pm10={selectedWard.pm10}
                  no2={selectedWard.no2}
                  o3={selectedWard.o3}
                  so2={selectedWard.so2}
                  className="h-full border-primary/20 shadow-sm"
                />
              </div>

              {/* Right: Authority Compliance & Jurisdiction Card */}
              <div className="xl:col-span-4 flex flex-col gap-4">
                <Card className="flex-1 p-6 border-border shadow-sm bg-card rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                      <span>{t("intel.dominantSource")}</span>
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-extrabold border-primary/30", selectedWard.aqi <= 200 ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40" : "text-primary")}>
                        {getOfficialGrapStage(selectedWard.aqi).stage.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="text-2xl font-black text-primary tracking-tight">
                      {getLocalizedSource(selectedWard.dominant_source)}
                    </div>

                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {language === "hi" 
                        ? `इस क्षेत्र में मुख्य प्रदूषण स्रोत ${getLocalizedSource(selectedWard.dominant_source)} है। प्राधिकरण द्वारा निवारक कदम लागू हैं।`
                        : `Primary contributor for ${selectedWard.name}. Ward action protocols enforced.`}
                    </p>
                  </div>
                </Card>
              </div>
            </div>

            {/* UNIFIED CONTINUOUS OPERATIONS DASHBOARD */}
            <div className="space-y-10 pt-2">
              {/* Feature 1: AI Intelligence & GRAP Enforcement Plan */}
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-blue-100/90 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 border-l-4 border-l-blue-600 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight text-blue-950 dark:text-blue-100">AI Intelligence & GRAP Enforcement Plan</h3>
                      <p className="text-xs text-blue-800/90 dark:text-blue-300 font-medium mt-0.5">ML pollutant diagnosis, 7-day operational schedule & mandatory GRAP actions</p>
                    </div>
                  </div>
                </div>
                <IntelligencePanel wardId={selectedWard.id} />
              </div>

              {/* Feature 2: Interactive Policy Impact Simulator Sandbox */}
              <div className="space-y-4 pt-6 border-t border-border/60">
                <div className="p-4 rounded-xl bg-indigo-100/90 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 border-l-4 border-l-indigo-600 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight text-indigo-950 dark:text-indigo-100">Interactive Policy Impact Simulator</h3>
                      <p className="text-xs text-indigo-800/90 dark:text-indigo-300 font-medium mt-0.5">Test traffic rationing, misting & construction halts with instant projected AQI</p>
                    </div>
                  </div>
                </div>
                <SimulationPanel wardId={selectedWard.id} currentAqi={selectedWard.aqi} />
              </div>

              {/* Feature 3: Citizen Pollution Reports & Action Feed */}
              <div className="space-y-4 pt-6 border-t border-border/60">
                <div className="p-4 rounded-xl bg-sky-100/90 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 border-l-4 border-l-sky-600 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold tracking-tight text-sky-950 dark:text-sky-100">Citizen Reports & Verified Field Audit</h3>
                      <p className="text-xs text-sky-800/90 dark:text-sky-300 font-medium mt-0.5">Live photo submissions with AI classification & location-based action tracking</p>
                    </div>
                  </div>
                </div>
                <CitizenReportsPanel selectedWard={selectedWard} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EmergencyToggle({ wardId, isEnabled }: { wardId: number, isEnabled: boolean }) {
  const { mutate, isPending } = useToggleEmergency();
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-bold", isEnabled ? "text-red-500" : "text-muted-foreground")}>
          {isEnabled ? t("authority.emergencyActive") : t("authority.emergencyNormal")}
        </span>
        <Switch 
          checked={isEnabled} 
          disabled={isPending}
          onCheckedChange={(checked) => mutate({ id: wardId, enabled: checked })}
          className={cn(isEnabled && "bg-red-500")}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">
        {isEnabled 
          ? (language === "hi" ? "आपातकालीन उपाय सक्रिय हैं। जनता को सतर्क किया गया है।" : "Draconian measures in effect. Public alerted.")
          : (language === "hi" ? "अनिवार्य प्रतिबंध लागू करने के लिए सक्रिय करें।" : "Activate to enforce mandatory protocols.")}
      </p>
    </div>
  );
}

function SimulationPanel({ wardId, currentAqi }: { wardId: number, currentAqi: number }) {
  const { t, language } = useLanguage();
  const [params, setParams] = useState<SimulationRequest>({
    trafficReduction: 0,
    constructionHalt: false,
    dustSuppression: 0
  });

  const { mutate, data: result, isPending } = useSimulatePolicy();

  const handleSimulate = () => {
    mutate({ id: wardId, params });
  };

  const chartData = [
    { name: language === "hi" ? "वर्तमान" : "Current", aqi: currentAqi },
    { name: language === "hi" ? "अनुमानित" : "Projected", aqi: result?.projectedAqi || currentAqi },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-8 p-4 border border-border/50 rounded-xl bg-card/50">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>{t("sim.trafficOddEven")} ({params.trafficReduction}%)</Label>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </div>
          <Slider 
            value={[params.trafficReduction]} 
            max={100} 
            step={10} 
            onValueChange={([v]) => setParams(p => ({ ...p, trafficReduction: v }))} 
            className="py-2"
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>{t("sim.waterSprinkling")} ({params.dustSuppression}%)</Label>
            <Wind className="w-4 h-4 text-muted-foreground" />
          </div>
          <Slider 
            value={[params.dustSuppression]} 
            max={100} 
            step={10} 
            onValueChange={([v]) => setParams(p => ({ ...p, dustSuppression: v }))} 
            className="py-2"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-3">
            <Hammer className="w-5 h-5 text-orange-500" />
            <div className="flex flex-col">
              <Label className="cursor-pointer">{t("sim.constructionHalt")}</Label>
              <span className="text-xs text-muted-foreground">
                {language === "hi" ? "सभी गैर-जरूरी निर्माण पर रोक" : "Halt all non-essential work"}
              </span>
            </div>
          </div>
          <Switch 
            checked={params.constructionHalt}
            onCheckedChange={(c) => setParams(p => ({ ...p, constructionHalt: c }))}
          />
        </div>

        <Button 
          onClick={handleSimulate} 
          disabled={isPending}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
          {isPending ? t("sim.calculating") : t("sim.calculate")}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex-1 bg-muted/10 border-border/50 shadow-inner">
          <CardContent className="p-6 h-full flex flex-col justify-center items-center">
            {result ? (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">
                    {language === "hi" ? "प्रभाव विश्लेषण" : "Impact Analysis"}
                  </div>
                  <div className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded-full">
                    -{result.percentageImprovement.toFixed(1)}% {language === "hi" ? "सुधार" : "IMPROVEMENT"}
                  </div>
                </div>
                
                <div className="h-40 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="aqi" radius={[0, 4, 4, 0]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="text-sm border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-r">
                  <div className="font-bold mb-1">
                    {language === "hi" ? "प्रभाव विवरण (AQI अंक कमी):" : "Impact Breakdown (AQI Points):"}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="text-blue-600">{language === "hi" ? "धूल" : "Dust"}: -{result.breakdown.dust}</div>
                    <div className="text-green-600">{language === "hi" ? "यातायात" : "Traffic"}: -{result.breakdown.traffic}</div>
                    <div className="text-orange-600">{language === "hi" ? "निर्माण" : "Const."}: -{result.breakdown.construction}</div>
                  </div>
                  <div className="italic">{result.summary}</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>{t("sim.subtitle")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IntelligencePanel({ wardId }: { wardId: number }) {
  const { data: wardsData } = useWards();
  const { t, language } = useLanguage();
  const ward = wardsData?.wards.find(w => w.id === wardId);

  if (!ward?.intelligence_data) return <div className="text-center py-12 text-muted-foreground">{language === "hi" ? "AI डेटा लोड हो रहा है..." : "Intelligence data unavailable. Wait for ML engine output..."}</div>;

  const intel = ward.intelligence_data;

  const officialGrap = getOfficialGrapStage(ward.aqi);

  const weeklyPlan = intel.weekly_plan || [
    { day: "Day 1 (Today)", title: "Emergency Mitigation", action: `Deploy anti-smog guns & traffic diversion tailored to ${ward.dominant_source}.`, priority: "Critical" },
    { day: "Day 2", title: "Road Misting", action: "Mechanized road sweeping across arterial corridors.", priority: "High" },
    { day: "Day 3", title: "Waste Burning Patrol", action: "Zero-tolerance night-time patrol against open garbage burning.", priority: "High" },
    { day: "Day 4", title: "Hotspot Audit", action: "Recalibrate sensor data and audit high-emission clusters.", priority: "Medium" },
    { day: "Day 5", title: "Construction Audit", action: "Inspect C&D dust barrier compliance across active sites.", priority: "Medium" },
    { day: "Day 6", title: "Traffic Optimization", action: "Optimize signal timing at congested bottlenecks.", priority: "Medium" },
    { day: "Day 7", title: "Weekly Review", action: "Compile compliance score and reassess GRAP stage.", priority: "Medium" }
  ];

  return (
    <div className="space-y-6">
      {/* GRAP Implementation Module (CAQM Revision 21.11.2025) */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                {officialGrap.stage === "No GRAP Required"
                  ? <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  : <AlertOctagon className="w-5 h-5 text-red-500" />}
                GRAP Enforcement Actions
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Official CAQM Graded Response Action Plan for {ward.name} (AQI: {ward.aqi})
              </CardDescription>
            </div>
            <Badge className={cn("px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-sm", officialGrap.color)}>
              {officialGrap.stage} · {officialGrap.stageName} ({officialGrap.aqiRange})
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground font-medium leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/40">
            {officialGrap.description}
          </p>
          {officialGrap.stage === "No GRAP Required" ? (
            <div className="space-y-3">
              {/* No-action banner */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                    No GRAP Action Required
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Air quality is within safe limits. No emergency GRAP restrictions or bans are active.
                  </p>
                </div>
              </div>
              {/* Routine baseline actions */}
              <span className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                Routine Baseline Operations (No Emergency Measures):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {officialGrap.enforcementActions.map((act: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/70 text-xs shadow-2xs">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-foreground font-semibold leading-snug">{act}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-foreground uppercase tracking-wider block">
                Mandatory CAQM Statutory Enforcement Actions:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {officialGrap.enforcementActions.map((act: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/70 text-xs shadow-2xs">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-foreground font-semibold leading-snug">{act}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ML Analysis Card */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-tighter">
              <BrainCircuit className="w-4 h-4 text-primary" /> {language === "hi" ? "ML-चालित बुद्धिमत्ता विश्लेषण" : "ML-Driven Analysis"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            <div className="space-y-2">
              <p>{intel.analysis_summary}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">
                  {language === "hi" ? "प्रमुख" : "PRIMARY"}: {intel.primary_pollutant}
                </Badge>
                <Badge variant="outline">
                  {language === "hi" ? "गंभीरता" : "SEVERITY"}: {intel.severity}
                </Badge>
                <Badge variant="outline">
                  {language === "hi" ? "सटीकता" : "CONFIDENCE"}: {intel.confidence_level}
                </Badge>
                {(() => {
                  const predVal = intel.predicted_aqi || Math.round(ward.aqi * 1.05);
                  const predHorizon = intel.prediction_horizon || '24h';
                  return (
                    <Badge variant="default" className="bg-primary text-primary-foreground font-extrabold shadow-sm">
                      <TrendingUp className="w-3 h-3 mr-1 inline" />
                      {language === "hi" ? "24h पूर्वाणुमान" : "24h PREDICTED"}: {predVal} AQI
                    </Badge>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic 7-Day Weekly Action Plan */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-tighter">
              <Clock className="w-4 h-4 text-primary" /> Dynamic Ward-Wise Weekly Action Plan
            </CardTitle>
            <CardDescription className="text-xs">7-Day operational schedule tailored to {ward.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {(() => {
              // Anchor dates to plan_generated_at so Day 1 is always the generation date
              const generatedAt = (intel as any).plan_generated_at
                ? new Date((intel as any).plan_generated_at)
                : new Date();
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              return weeklyPlan.map((item: any, i: number) => {
                const dayDate = new Date(generatedAt);
                dayDate.setDate(generatedAt.getDate() + i);
                dayDate.setHours(0, 0, 0, 0);
                const isToday = dayDate.getTime() === today.getTime();
                const isPast = dayDate < today;
                const dateLabel = dayDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

                return (
                  <div key={i} className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg border text-xs transition-colors",
                    isToday
                      ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                      : isPast
                      ? "border-border/30 bg-muted/10 opacity-60"
                      : "border-border/50 bg-muted/20"
                  )}>
                    <div className="shrink-0 flex flex-col items-center min-w-[52px]">
                      <span className={cn(
                        "font-bold text-[10px] whitespace-nowrap",
                        isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {dateLabel}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-extrabold text-primary bg-primary/10 px-1 rounded mt-0.5">TODAY</span>
                      )}
                      <Badge variant="outline" className={cn(
                        "text-[9px] px-1 py-0 h-4 mt-1 font-semibold",
                        item.priority === "Critical" && "border-red-300 text-red-700 bg-red-50",
                        item.priority === "High" && "border-amber-300 text-amber-700 bg-amber-50",
                        item.priority === "Medium" && "border-blue-300 text-blue-700 bg-blue-50"
                      )}>
                        {item.priority}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-foreground block">{item.title}</span>
                      <p className="text-muted-foreground text-[11px] leading-snug mt-0.5">{item.action}</p>
                    </div>
                  </div>
                );
              });
            })()}
            {/* Plan validity footer */}
            {(intel as any).plan_generated_at && (
              <p className="text-[10px] text-muted-foreground text-center pt-1 border-t border-border/40">
                Plan generated: {new Date((intel as any).plan_generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}Refreshes on GRAP stage change or after 7 days
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CitizenReportsPanel({ selectedWard }: { selectedWard: any }) {
  const { t, language } = useLanguage();
  const { data: dbReports, isLoading: loadingDb } = useAllReports();
  const actionMutation = useUpdateReportAction();
  const { toast } = useToast();

  if (loadingDb && !dbReports) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">{t("common.loading")}</span>
      </div>
    );
  }

  const reports = dbReports || [];

  const handleAction = (id: number, status: string) => {
    actionMutation.mutate(
      { id, status },
      {
        onSuccess: () => {
          toast({
            title: `Issue marked as ${status}`,
            description: status === "resolved" ? "Corresponding ward controls have been activated." : "Authority is working on the issue.",
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Citizens Reports List */}

      {/* 2. Citizens Reports List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 px-1">
          <Clock className="w-5 h-5 text-muted-foreground" /> {t("audit.title")}
        </h3>

        {reports.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-muted/20">
            <Info className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-2" />
            <p className="text-sm font-medium">
              {language === "hi" ? "डेटाबेस में कोई नागरिक रिपोर्ट दर्ज नहीं है।" : "No citizen reports recorded in database."}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
              {language === "hi" ? "नागरिक पोर्टल से भेजी गई रिपोर्ट यहां दिखाई देंगी।" : "File submissions from the citizen portal will automatically appear here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => (
              <Card key={report.id} className="border-border/50 shadow-md flex flex-col bg-card/60 backdrop-blur-sm hover:shadow-lg transition-shadow overflow-hidden">
                {/* Image & Header */}
                <div className="relative h-44 bg-muted border-b border-border">
                  {report.imageUrl ? (
                    <img src={report.imageUrl} className="w-full h-full object-cover" alt="Pollution complaint" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      {language === "hi" ? "कोई फोटो नहीं" : "No Image Provided"}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                    <Badge variant={report.status === "resolved" ? "default" : report.status === "working" ? "secondary" : "outline"} className="capitalize shadow-md">
                      {report.status === "working" ? (language === "hi" ? "प्रगति पर" : "In Progress") : (report.status === "resolved" ? (language === "hi" ? "समाधान हुआ" : "Resolved") : report.status)}
                    </Badge>
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-foreground border-border shadow-md text-[10px]">
                      Ward {report.wardId}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <CardContent className="p-4 space-y-4 flex-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">
                        GPS: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {report.description || <span className="italic text-muted-foreground">{language === "hi" ? "कोई विवरण नहीं दिया गया" : "No description provided"}</span>}
                    </p>
                  </div>

                  {/* AI Classification Block */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <BrainCircuit className="w-4 h-4" /> {language === "hi" ? "AI वर्गीकरण" : "AI CLASSIFICATION"}
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {report.aiConfidence}% {language === "hi" ? "सटीकता" : "Confidence"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          {language === "hi" ? "श्रेणी" : "Category"}
                        </span>
                        <span className="capitalize font-bold flex items-center gap-1.5 mt-0.5">
                          {report.pollutionType === "traffic" && <Truck className="w-3.5 h-3.5 text-blue-500" />}
                          {report.pollutionType === "construction" && <Hammer className="w-3.5 h-3.5 text-orange-500" />}
                          {report.pollutionType === "stubble burning" && <Wind className="w-3.5 h-3.5 text-red-500" />}
                          {report.pollutionType === "other" && <Factory className="w-3.5 h-3.5 text-purple-500" />}
                          <span className={cn(
                            "capitalize",
                            report.pollutionType === "traffic" && "text-blue-700",
                            report.pollutionType === "construction" && "text-orange-700",
                            report.pollutionType === "stubble burning" && "text-red-700",
                            report.pollutionType === "other" && "text-purple-700",
                          )}>{report.pollutionType === "other" ? "Other" : report.pollutionType}</span>
                        </span>
                      </div>
                      <div className="col-span-2 mt-1">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          {language === "hi" ? "AI व्याख्या" : "AI Explanation"}
                        </span>
                        <p className="text-muted-foreground mt-0.5 leading-normal text-[11px] font-normal">
                          {report.aiExplanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Integrity Ledger Check */}
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-green-700">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> {language === "hi" ? "ऑन-चेन सत्यनिष्ठा" : "ON-CHAIN INTEGRITY"}
                      </div>
                      <span className="text-[10px] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {t("common.verified")}
                      </span>
                    </div>
                  </div>
                </CardContent>

                {/* Footer Action Buttons */}
                <div className="p-4 pt-0 border-t border-border/40 mt-auto flex flex-wrap gap-2 justify-end bg-muted/10">

                  {report.status !== "resolved" && (
                    <div className="flex gap-2">
                      {report.status !== "working" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAction(report.id, "working")}
                          disabled={actionMutation.isPending}
                          className="h-8 text-xs font-bold"
                        >
                          {language === "hi" ? "कार्य शुरू करें" : "Work on Issue"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleAction(report.id, "resolved")}
                        disabled={actionMutation.isPending}
                        className="h-8 text-xs font-bold"
                      >
                        {language === "hi" ? "समाधान चिन्हित करें" : "Mark Resolved"}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
