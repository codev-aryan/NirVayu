import { useState, useEffect } from "react";
import { useWards, useToggleEmergency, useUpdateControls, useSimulatePolicy, useWardIntelligence, useAllReports, useUpdateReportAction, useDeleteReportLocal, useRestoreReport, useBlockchainLedger } from "@/hooks/use-wards";
import { Loader2, Activity, Trophy, Medal, AlertTriangle, AlertOctagon, ShieldAlert, ShieldCheck, Truck, Hammer, Wind, Factory, TrendingDown, BarChart3, CheckCircle, ExternalLink, BrainCircuit, Info, Clock, Trash2, RefreshCw } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

import { ControlType, SimulationRequest } from "@shared/schema";

export function AuthorityDashboard() {
  const { data, isLoading } = useWards();
  const { t, language } = useLanguage();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

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
      {/* LEFT: Ward List & Map */}
      <div className="lg:col-span-4 flex flex-col gap-6 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> {t("authority.lastUpdated")}: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </div>

        <Card className="flex-1 flex flex-col border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>{t("authority.wardMonitor")}</span>
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {wards.length} {t("common.active")}
              </span>
            </CardTitle>
            <CardDescription>{t("authority.jurisdictionDesc")}</CardDescription>
          </CardHeader>
          <div className="flex-1 relative min-h-[300px]">
            <WardMap 
              wards={wards} 
              selectedWardId={selectedWard?.id} 
              onSelectWard={setSelectedWardId}
              className="absolute inset-0 m-4 rounded-xl border border-border"
            />
          </div>
          <div className="h-[300px] overflow-y-auto border-t border-border/50 p-2 space-y-2">
            {sortedWards.map(ward => (
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
                  <div />
                  <StatusBadge aqi={ward.aqi} size="sm" />
                </div>
              </div>
            ))}
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
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">
                    {language === "hi" ? "वर्तमान AQI" : "Current AQI"}
                  </div>
                  <div className="text-4xl font-display font-bold text-foreground">{selectedWard.aqi}</div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> {t("common.realtime")}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">{t("intel.dominantSource")}</div>
                  <div className="text-2xl font-display font-bold text-primary truncate" title={selectedWard.dominant_source}>
                    {getLocalizedSource(selectedWard.dominant_source)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> {language === "hi" ? "शीर्ष योगदानकर्ता" : "Top Contributor"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="intelligence" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
                <TabsTrigger value="intelligence">{t("authority.tab.intelligence")}</TabsTrigger>
                <TabsTrigger value="simulation">{t("authority.tab.simulation")}</TabsTrigger>
                <TabsTrigger value="reports">{t("authority.tab.reports")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="intelligence" className="mt-6">
                <IntelligencePanel wardId={selectedWard.id} />
              </TabsContent>
              
              <TabsContent value="simulation" className="mt-6">
                <SimulationPanel wardId={selectedWard.id} currentAqi={selectedWard.aqi} />
              </TabsContent>

              <TabsContent value="reports" className="mt-6">
                <CitizenReportsPanel selectedWard={selectedWard} />
              </TabsContent>
            </Tabs>
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

  const grap = intel.grap_info || {
    stage: ward.aqi > 400 ? "STAGE IV" : ward.aqi > 300 ? "STAGE III" : ward.aqi > 200 ? "STAGE II" : "STAGE I",
    stageName: ward.aqi > 400 ? "Severe+ Emergency" : ward.aqi > 300 ? "Severe Pollution" : ward.aqi > 200 ? "Very Poor" : "Poor",
    color: ward.aqi > 400 ? "bg-red-600 text-white" : ward.aqi > 300 ? "bg-orange-600 text-white" : "bg-amber-600 text-white",
    description: `Current AQI ${ward.aqi} requires active GRAP enforcement.`,
    enforcement_actions: [
      "Deploy anti-smog guns continuously at high-density traffic junctions",
      "Mechanized road sweeping and chemical dust suppressant application",
      "Strict ban on open burning of garbage and plastic waste",
      "Enforce mandatory dust covers on all active construction projects"
    ]
  };

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
      {/* GRAP Implementation Module */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" /> GRAP Implementation Suggestions
            </CardTitle>
            <Badge className={cn("px-2.5 py-1 text-xs font-bold uppercase", grap.color)}>
              {grap.stage} · {grap.stageName}
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Graded Response Action Plan status for {ward.name} (AQI: {ward.aqi})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{grap.description}</p>
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">Mandatory Enforcement Actions:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {grap.enforcement_actions.map((act: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium leading-snug">{act}</span>
                </div>
              ))}
            </div>
          </div>
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
                {intel.predicted_aqi && (
                  <Badge variant="default" className="bg-primary text-primary-foreground font-bold">
                    {language === "hi" ? "पूर्वानुमान" : "PREDICTED"} ({intel.prediction_horizon || '24h'}): {intel.predicted_aqi}
                  </Badge>
                )}
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
            {weeklyPlan.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs">
                <div className="shrink-0 flex flex-col items-center">
                  <span className="font-bold text-primary text-[11px] whitespace-nowrap">{item.day}</span>
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
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-tighter">
            <Activity className="w-4 h-4 text-primary" /> {t("intel.allowedControls")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(intel.allowed_controls as string[]).map((control: string, i: number) => (
              <Badge key={i} variant="secondary" className="uppercase text-[10px]">
                {control.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CitizenReportsPanel({ selectedWard }: { selectedWard: any }) {
  const { t, language } = useLanguage();
  const { data: dbReports, isLoading: loadingDb } = useAllReports();
  const { data: chainReports, isLoading: loadingChain } = useBlockchainLedger();
  const actionMutation = useUpdateReportAction();
  const deleteMutation = useDeleteReportLocal();
  const restoreMutation = useRestoreReport();
  const { toast } = useToast();

  // Only show spinner on very first load (no data yet), not on background refetches
  if ((loadingDb && !dbReports) || (loadingChain && !chainReports)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">{t("common.loading")}</span>
      </div>
    );
  }

  const reports = dbReports || [];
  const ledger = chainReports || [];

  const dbHashes = new Set(reports.map(r => r.mediaHash));
  const missingReports = ledger.filter(ledgerItem => {
    return !dbHashes.has(ledgerItem.hash) && ledgerItem.metadata;
  });

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

  const handleSimulateTampering = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Mediator Deletion Simulated",
          description: "The report has been deleted from the database. View the blockchain audit alert below.",
          variant: "destructive"
        });
      }
    });
  };

  const handleRestore = (ledgerItem: any) => {
    if (!ledgerItem.metadata) return;
    restoreMutation.mutate(ledgerItem.metadata, {
      onSuccess: () => {
        toast({
          title: "Database Record Restored",
          description: "The report record has been successfully recovered from the immutable blockchain ledger.",
        });
      }
    });
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
                <div className="p-4 pt-0 border-t border-border/40 mt-auto flex flex-wrap gap-2 justify-between bg-muted/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSimulateTampering(report.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold text-xs flex items-center gap-1 px-2.5 h-8 border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {language === "hi" ? "छेड़छाड़ सिमुलेट करें" : "Simulate Deletion"}
                  </Button>

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
