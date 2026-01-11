import { useState, useEffect } from "react";
import { useWards, useToggleEmergency, useUpdateControls, useSimulatePolicy, useWardIntelligence } from "@/hooks/use-wards";
import { Loader2, Activity, Trophy, Medal, AlertTriangle, AlertOctagon, ShieldAlert, ShieldCheck, Truck, Hammer, Wind, TrendingDown, BarChart3, CheckCircle, ExternalLink, BrainCircuit, Info, Clock } from "lucide-react";
import { pollutionBlockchain } from "@/lib/blockchain";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { WardMap } from "./WardMap";
import { StatusBadge } from "./StatusBadge";
import { ControlType, SimulationRequest } from "@shared/schema";

export function AuthorityDashboard() {
  const { data, isLoading } = useWards();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Initializing Authority Grid...</p>
      </div>
    </div>
  );

  if (!data) return null;
  const { wards, lastUpdated } = data;

  const selectedWard = wards.find(w => w.id === selectedWardId) || wards[0];
  const sortedWards = [...wards].sort((a, b) => b.aqi - a.aqi);

  // WPRS Leaderboard ranking (Higher WPRS is better mitigation/lower pollution balance)
  const leaderboardWards = [...wards].sort((a, b) => b.wprs - a.wprs);
  const topWard = leaderboardWards[0];
  const criticalWard = [...wards].sort((a, b) => b.aqi - a.aqi)[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* LEFT: Ward List & Map */}
      <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Last Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </div>
        {/* WPRS Leaderboard */}
        <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> WPRS Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[200px] overflow-y-auto px-4 pb-4 space-y-2">
              {leaderboardWards.map((ward, idx) => (
                <div key={ward.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground w-4">{idx + 1}</span>
                    <span className="font-medium truncate max-w-[100px]">{ward.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-primary">{ward.wprs}</span>
                      <span className="text-[9px] text-muted-foreground">CREDITS: {ward.citizen_credits}</span>
                    </div>
                    {idx === 0 && <Medal className="w-4 h-4 text-yellow-500" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-muted/50 border-t border-border/50 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-500"/> Best:</span>
                <span className="font-bold text-green-600">{topWard.name} ({topWard.wprs})</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500"/> Critical:</span>
                <span className="font-bold text-red-600">{criticalWard.name} (AQI {criticalWard.aqi})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Ward Monitor</span>
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">{wards.length} Active</span>
            </CardTitle>
            <CardDescription>Live pollution tracking by jurisdiction</CardDescription>
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
                  <span>WPRS: <span className={cn(
                    "font-mono font-bold",
                    ward.wprs > 80 ? "text-red-500" : "text-green-500"
                  )}>{ward.wprs}</span></span>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Current AQI</div>
                  <div className="text-4xl font-display font-bold text-foreground">{selectedWard.aqi}</div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Real-time
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Primary Source</div>
                  <div className="text-2xl font-display font-bold text-primary truncate" title={selectedWard.dominant_source}>
                    {selectedWard.dominant_source}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Top Contributor
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">WPRS Score</div>
                  <div className={cn(
                    "text-4xl font-display font-bold",
                    selectedWard.wprs > 80 ? "text-red-500" : "text-yellow-500"
                  )}>{selectedWard.wprs}</div>
                  <div className="text-xs text-muted-foreground mt-2">Responsibility Index</div>
                </CardContent>
              </Card>
              <Card className={cn(
                "border-2 transition-colors",
                selectedWard.emergency_mode ? "border-red-500/50 bg-red-500/10" : "border-border/50"
              )}>
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className={cn("w-4 h-4", selectedWard.emergency_mode && "text-red-500")} />
                    Emergency Protocol
                  </div>
                  <EmergencyToggle wardId={selectedWard.id} isEnabled={selectedWard.emergency_mode} />
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="controls" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
                <TabsTrigger value="controls">Active Controls</TabsTrigger>
                <TabsTrigger value="intelligence">AI Intel</TabsTrigger>
                <TabsTrigger value="simulation">Policy Simulation</TabsTrigger>
                <TabsTrigger value="reports">Citizen Reports</TabsTrigger>
              </TabsList>
              
              <TabsContent value="controls" className="mt-6">
                <ControlsPanel ward={selectedWard} />
              </TabsContent>

              <TabsContent value="intelligence" className="mt-6">
                <IntelligencePanel wardId={selectedWard.id} />
              </TabsContent>
              
              <TabsContent value="simulation" className="mt-6">
                <SimulationPanel wardId={selectedWard.id} currentAqi={selectedWard.aqi} />
              </TabsContent>

              <TabsContent value="reports" className="mt-6">
                <ReportsPanel wardId={selectedWard.id} />
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

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-bold", isEnabled ? "text-red-500" : "text-muted-foreground")}>
          {isEnabled ? "ACTIVE" : "INACTIVE"}
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
          ? "Draconian measures in effect. Public alerted." 
          : "Activate to enforce mandatory lockdowns."}
      </p>
    </div>
  );
}

function ControlsPanel({ ward }: { ward: any }) {
  const { mutate, isPending } = useUpdateControls();
  
  const allControls: { id: ControlType, label: string, icon: any }[] = [
    { id: "traffic_odd_even", label: "Odd-Even Traffic", icon: Truck },
    { id: "construction_halt", label: "Halt Construction", icon: Hammer },
    { id: "water_sprinkling" as any, label: "Water Sprinkling", icon: Wind },
    { id: "industry_shutdown", label: "Industry Shutdown", icon: AlertOctagon },
    { id: "traffic_heavy_ban", label: "Ban Heavy Vehicles", icon: Truck },
    { id: "waste_burning_ban", label: "Zero Waste Burning", icon: ShieldAlert },
  ];

  const activeSet = new Set(ward.active_controls);

  const toggleControl = (controlId: string) => {
    const newControls = activeSet.has(controlId) 
      ? ward.active_controls.filter((c: string) => c !== controlId)
      : [...ward.active_controls, controlId];
    
    mutate({ id: ward.id, controls: newControls });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allControls.map((control) => {
        const isActive = activeSet.has(control.id);
        const Icon = control.icon;
        
        return (
          <Button
            key={control.id}
            variant="outline"
            className={cn(
              "h-auto py-6 flex flex-col items-center gap-3 transition-all border-2",
              isActive 
                ? "border-primary bg-primary/5 text-primary shadow-md shadow-primary/10" 
                : "border-muted hover:border-primary/50 text-muted-foreground hover:text-foreground"
            )}
            onClick={() => toggleControl(control.id)}
            disabled={isPending}
          >
            <Icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
            <div className="flex flex-col items-center">
              <span className="font-semibold">{control.label}</span>
              <span className="text-[10px] font-normal opacity-70">
                {isActive ? "Enforced" : "Disabled"}
              </span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

function SimulationPanel({ wardId, currentAqi }: { wardId: number, currentAqi: number }) {
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
    { name: "Current", aqi: currentAqi },
    { name: "Projected", aqi: result?.projectedAqi || currentAqi },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-8 p-4 border border-border/50 rounded-xl bg-card/50">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Traffic Reduction ({params.trafficReduction}%)</Label>
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
            <Label>Dust Suppression ({params.dustSuppression}%)</Label>
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
              <Label className="cursor-pointer">Construction Ban</Label>
              <span className="text-xs text-muted-foreground">Halt all non-essential work</span>
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
          Run Simulation
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex-1 bg-muted/10 border-border/50 shadow-inner">
          <CardContent className="p-6 h-full flex flex-col justify-center items-center">
            {result ? (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Impact Analysis</div>
                  <div className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded-full">
                    -{result.percentageImprovement.toFixed(1)}% IMPROVEMENT
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
                  <div className="font-bold mb-1">Impact Breakdown (AQI Points):</div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="text-blue-600">Dust: -{result.breakdown.dust}</div>
                    <div className="text-green-600">Traffic: -{result.breakdown.traffic}</div>
                    <div className="text-orange-600">Const.: -{result.breakdown.construction}</div>
                  </div>
                  <div className="italic">{result.summary}</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Adjust parameters and run simulation to see projected impact.</p>
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
  const ward = wardsData?.wards.find(w => w.id === wardId);

  if (!ward?.intelligence_data) return <div className="text-center py-12 text-muted-foreground">Intelligence data unavailable. Wait for ML engine output...</div>;

  const intel = ward.intelligence_data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/30 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-tighter">
              <BrainCircuit className="w-4 h-4 text-primary" /> ML-Driven Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            <div className="space-y-2">
              <p>{intel.analysis_summary}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">PRIMARY: {intel.primary_pollutant}</Badge>
                <Badge variant="outline">SEVERITY: {intel.severity}</Badge>
                <Badge variant="outline">CONFIDENCE: {intel.confidence_level}</Badge>
                {intel.predicted_aqi && (
                  <Badge variant="default" className="bg-primary text-primary-foreground font-bold">
                    PREDICTED ({intel.prediction_horizon || '24h'}): {intel.predicted_aqi}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-tighter">
              <ShieldCheck className="w-4 h-4 text-green-600" /> 90-Day Execution Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-[10px] font-bold text-primary uppercase mb-1">Days 0-30: Immediate</div>
              <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                {intel.execution_plan_90_days.days_0_30.map((task, i) => <li key={i}>{task}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-bold text-primary uppercase mb-1">Days 31-60: Enforcement</div>
              <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                {intel.execution_plan_90_days.days_31_60.map((task, i) => <li key={i}>{task}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-bold text-primary uppercase mb-1">Days 61-90: Monitoring</div>
              <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                {intel.execution_plan_90_days.days_61_90.map((task, i) => <li key={i}>{task}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-tighter">
            <Activity className="w-4 h-4 text-primary" /> Allowed Mitigation Controls
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

function ReportsPanel({ wardId }: { wardId: number }) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMining, setIsMining] = useState(false);
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      await pollutionBlockchain.initialize();
      setReports(pollutionBlockchain.getComplaints().filter(c => c.wardId === wardId));
      setIsLoading(false);
    };
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [wardId]);

  const updateStatus = async (complaintId: string, newStatus: string) => {
    setIsMining(true);
    try {
      await pollutionBlockchain.addBlock({
        type: 'status_update',
        complaintId,
        newStatus,
        notes: statusNotes[complaintId] || '',
        updatedAt: new Date().toISOString()
      });
      setReports(pollutionBlockchain.getComplaints().filter(c => c.wardId === wardId));
    } finally {
      setIsMining(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" /> Immutable Citizen Reports
        </CardTitle>
        <CardDescription>Tamper-proof pollution evidence secured on blockchain.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No reports filed for this ward yet.</div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-4 border-l-4 border-l-primary">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{report.pollutionType}</Badge>
                      <Badge className={cn(
                        report.severity === 'High' ? "bg-red-500" : report.severity === 'Medium' ? "bg-orange-500" : "bg-yellow-500"
                      )}>{report.severity}</Badge>
                    </div>
                    <p className="text-sm font-medium">{report.description}</p>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(report.submittedAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Hash: {report.hash.slice(0, 16)}...</span>
                    </div>
                    
                    {report.status !== 'resolved' && (
                      <div className="flex gap-2 pt-2">
                        <Input 
                          placeholder="Resolution notes..." 
                          className="h-8 text-xs" 
                          value={statusNotes[report.id] || ''}
                          onChange={(e) => setStatusNotes(p => ({ ...p, [report.id]: e.target.value }))}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs"
                          disabled={isMining}
                          onClick={() => updateStatus(report.id, 'in-progress')}
                        >
                          Mark In-Progress
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-8 text-xs"
                          disabled={isMining}
                          onClick={() => updateStatus(report.id, 'resolved')}
                        >
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                  {report.evidence && (
                    <img src={report.evidence} className="w-24 h-24 object-cover rounded border" alt="evidence" />
                  )}
                </div>
                {report.authorityNotes && (
                  <div className="mt-3 p-2 bg-muted rounded text-xs italic border-l-2 border-primary">
                    Authority: {report.authorityNotes}
                  </div>
                )}
                <div className="mt-2 flex justify-between items-center border-t pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">STATUS:</span>
                    <Badge variant={report.status === 'resolved' ? 'default' : 'secondary'} className="uppercase text-[9px]">
                      {report.status}
                    </Badge>
                  </div>
                  {report.resolvedAt && (
                    <span className="text-[9px] text-green-600 font-bold uppercase">
                      Resolved on {new Date(report.resolvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
