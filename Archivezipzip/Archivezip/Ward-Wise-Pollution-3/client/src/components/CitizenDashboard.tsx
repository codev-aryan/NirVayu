import { useState, useEffect } from "react";
import { useWards, useGeneratePlan, useAddCredit } from "@/hooks/use-wards";
import { MapPin, Clock, AlertTriangle, Leaf, ShieldCheck, HeartPulse, Camera, Trash2, ShieldAlert, CheckCircle2, Upload, Car, Construction, Factory, Wind, Trees, Loader2 } from "lucide-react";
import { pollutionBlockchain } from "@/lib/blockchain";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { WardMap } from "./WardMap";
import { StatusBadge } from "./StatusBadge";

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case "Traffic": return <Car className="w-4 h-4 text-blue-500" />;
    case "Construction": return <Construction className="w-4 h-4 text-orange-500" />;
    case "Industrial Emissions": return <Factory className="w-4 h-4 text-red-500" />;
    case "Waste Burning": return <Trees className="w-4 h-4 text-amber-600" />;
    default: return <Wind className="w-4 h-4 text-gray-500" />;
  }
}

export function CitizenDashboard() {
  const { data, isLoading } = useWards();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const addCreditMutation = useAddCredit();
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  if (isLoading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!data) return null;
  const { wards, lastUpdated } = data;

  const selectedWard = wards.find(w => w.id === selectedWardId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* LEFT: Ward Selection */}
      <div className="md:col-span-5 lg:col-span-4 space-y-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <MapPin className="text-primary" /> Locate Your Ward
            </h2>
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-4">
            <Clock className="w-3 h-3" /> Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Select your neighborhood to see localized air quality data and health advice.
          </p>
          
          <div className="relative h-[300px] mb-4">
            <WardMap 
              wards={wards} 
              selectedWardId={selectedWardId || undefined} 
              onSelectWard={setSelectedWardId} 
              className="absolute inset-0 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Or select from list</Label>
            <Select 
              value={selectedWardId?.toString()} 
              onValueChange={(val) => setSelectedWardId(Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a ward..." />
              </SelectTrigger>
              <SelectContent>
                {wards.map(w => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {w.name} (AQI: {w.aqi})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedWard?.emergency_mode && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle className="w-24 h-24 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-red-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5" /> Emergency Declared!
            </h3>
            <p className="text-red-700 text-sm mb-4">
              Severe pollution levels detected in {selectedWard.name}. Immediate precautions required.
            </p>
            <ul className="text-sm text-red-800 space-y-2 font-medium">
              <li className="flex items-center gap-2">• Avoid all outdoor activities</li>
              <li className="flex items-center gap-2">• Wear N95 masks if stepping out</li>
              <li className="flex items-center gap-2">• Use air purifiers indoors</li>
            </ul>
          </motion.div>
        )}
      </div>

      {/* RIGHT: Detailed Info */}
      <div className="md:col-span-7 lg:col-span-8">
        {selectedWard ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <h1 className="text-4xl font-display font-bold text-primary mb-1">{selectedWard.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground mt-2">
                  <StatusBadge aqi={selectedWard.aqi} />
                  <span className="hidden md:inline">•</span>
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border border-border/50">
                    <SourceIcon source={selectedWard.dominant_source} />
                    <span className="text-sm font-medium">Primary Source: {selectedWard.dominant_source}</span>
                  </div>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-sm text-muted-foreground">Current AQI</div>
                <div className={cn("text-5xl font-bold", selectedWard.aqi > 200 ? "text-red-500" : "text-primary")}>
                  {selectedWard.aqi}
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="PM 2.5" value={selectedWard.pm25} unit="µg/m³" />
              <MetricCard label="PM 10" value={selectedWard.pm10} unit="µg/m³" />
              <MetricCard label="NO2" value={selectedWard.no2} unit="ppb" />
              <MetricCard label="CO2 Budget" value={selectedWard.co2_budget_remaining} unit="tons" color="text-green-600" />
            </div>

            {/* Actions Tabs */}
            <Tabs defaultValue="health" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-border p-0 h-auto gap-6 rounded-none">
                <TabsTrigger 
                  value="health" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0 font-bold text-muted-foreground data-[state=active]:text-foreground"
                >
                  Health Advisory
                </TabsTrigger>
                <TabsTrigger 
                  value="action"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0 font-bold text-muted-foreground data-[state=active]:text-foreground"
                >
                  Take Action
                </TabsTrigger>
                <TabsTrigger 
                  value="report"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-0 font-bold text-muted-foreground data-[state=active]:text-foreground"
                >
                  Report Pollution
                </TabsTrigger>
              </TabsList>

              <TabsContent value="health" className="mt-6 space-y-6">
                <SafeLifePlanner wardId={selectedWard.id} />
                <DailyPreventionModule selectedWard={selectedWard} />
              </TabsContent>

              <TabsContent value="action" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Leaf className="text-green-500"/> Prevention Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { label: "Use public transport", action: "public_transport" },
                        { label: "Don't burn waste", action: "no_waste_burning" },
                        { label: "Wet mop floors", action: "carpooling" },
                        { label: "Check car tire pressure", action: "carpooling" }
                      ].map((item, i) => {
                        const isDone = completedActions.has(item.label);
                        return (
                          <div 
                            key={i} 
                            onClick={() => {
                              if (isDone) return;
                              setCompletedActions(prev => new Set(prev).add(item.label));
                              addCreditMutation.mutate({ id: selectedWard.id, action: item.action as any });
                            }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                              isDone ? "bg-green-50 border-green-200 text-green-700" : "hover:bg-muted/50"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                              isDone ? "bg-green-500 border-green-500" : "border-primary/50"
                            )}>
                              {isDone && <ShieldCheck className="w-3 h-3 text-white" />}
                            </div>
                            <span>{item.label}</span>
                            {isDone && <span className="ml-auto text-[10px] font-bold">Done!</span>}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Ward Pollution Credits</CardTitle>
                      <CardDescription>Collective community action impact</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-center py-4">
                        <div className="text-5xl font-bold text-primary mb-2">{selectedWard.citizen_credits}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Aggregated Ward Credits</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Participation Level</span>
                          <span className="font-bold text-primary">
                            {selectedWard.citizen_credits > 2000 ? "High" : selectedWard.citizen_credits > 1000 ? "Medium" : "Low"}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (selectedWard.citizen_credits / 3000) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 text-center">
                        <p className="text-sm text-green-700 font-medium">
                          {selectedWard.citizen_credits > 0 
                            ? "Great job! Your ward's collective actions are actively reducing the WPRS score."
                            : "Start contributing to earn credits and improve your ward's health score!"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs h-auto py-2 px-3 whitespace-normal text-left flex justify-between items-center"
                          onClick={() => addCreditMutation.mutate({ id: selectedWard.id, action: "public_transport" })}
                        >
                          <span>Public Transport</span>
                          <span className="font-bold text-primary ml-2">+20</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs h-auto py-2 px-3 whitespace-normal text-left flex justify-between items-center"
                          onClick={() => addCreditMutation.mutate({ id: selectedWard.id, action: "plantation" })}
                        >
                          <span>Plantation</span>
                          <span className="font-bold text-primary ml-2">+30</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="report" className="mt-6">
                <PollutionReporter wardId={selectedWard.id} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-3xl bg-muted/20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Ward Selected</h3>
            <p className="text-muted-foreground max-w-sm">
              Please select your location from the map or list to view pollution data and health recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DailyPreventionModule({ selectedWard }: { selectedWard: any }) {
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const addCreditMutation = useAddCredit();
  const aqi = selectedWard.aqi;
  
  const checklist = {
    do: ["Check AQI before going out", "Stay hydrated"],
    avoid: ["Outdoor exercise during peak pollution", "Using wood-burning stoves"]
  };

  if (aqi < 100) {
    checklist.do.push("Enjoy outdoor parks", "Natural ventilation");
  } else if (aqi < 200) {
    checklist.do.push("Use a cloth mask");
    checklist.avoid.push("Heavy outdoor exertion");
  } else {
    checklist.do.push("Seal window gaps", "Run air purifier");
    checklist.avoid.push("Stepping outside for any reason");
  }

  const toggleAction = (item: string) => {
    if (completedActions.has(item)) return;
    
    setCompletedActions(prev => new Set(prev).add(item));
    // Each checklist action adds 10 credits to the ward
    addCreditMutation.mutate({ id: selectedWard.id, action: "carpooling" }); // Using carpooling as a proxy for "general green action"
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Preventive Measures Module
        </CardTitle>
        <CardDescription>Daily ward-specific actions for {selectedWard.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Personal</h4>
            <ul className="text-xs space-y-1 text-blue-800">
              <li>• Wear {aqi > 200 ? "N95" : "cloth"} mask</li>
              <li>• {aqi > 150 ? "Close windows" : "Moderate ventilation"}</li>
            </ul>
          </div>
          <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
            <h4 className="text-xs font-bold text-green-700 uppercase mb-2">Lifestyle</h4>
            <ul className="text-xs space-y-1 text-green-800">
              <li>• Prefer {aqi > 150 ? "Indoor" : "Public"} transport</li>
              <li>• Zero idling policy</li>
            </ul>
          </div>
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
            <h4 className="text-xs font-bold text-orange-700 uppercase mb-2">Community</h4>
            <ul className="text-xs space-y-1 text-orange-800">
              <li>• Participate in dust control</li>
              <li>• Report waste burning</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-bold">Daily Prevention Checklist (Complete to earn Credits)</h4>
          <div className="space-y-2">
            {checklist.do.map((item, i) => {
              const isDone = completedActions.has(item);
              return (
                <div 
                  key={i} 
                  onClick={() => toggleAction(item)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer",
                    isDone ? "bg-green-50 border-green-200 text-green-700" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    isDone ? "bg-green-500 border-green-500" : "border-primary/50"
                  )}>
                    {isDone && <ShieldCheck className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm">{item}</span>
                  {isDone && <span className="ml-auto text-[10px] font-bold">+10 Credits</span>}
                </div>
              );
            })}
            {checklist.avoid.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-700 p-2">
                <AlertTriangle className="w-4 h-4" /> {item}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, unit, color = "text-foreground" }: { label: string, value: number, unit: string, color?: string }) {
  return (
    <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold font-display", color)}>{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function SafeLifePlanner({ wardId }: { wardId: number }) {
  const [formData, setFormData] = useState({
    ageGroup: "adult" as "child" | "adult" | "elderly",
    condition: "healthy" as "healthy" | "asthma" | "sensitive",
    outdoorHours: "2"
  });

  const { mutate, data: plan, isPending } = useGeneratePlan();

  const handleSubmit = () => {
    mutate({ 
      id: wardId, 
      params: { 
        ...formData, 
        outdoorHours: Number(formData.outdoorHours) 
      } 
    });
  };

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-primary">
          <HeartPulse className="w-5 h-5" /> Safe Life Planner
        </CardTitle>
        <CardDescription>Get a personalized schedule based on your health profile.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!plan ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age Group</Label>
                <Select value={formData.ageGroup} onValueChange={(v: any) => setFormData(p => ({...p, ageGroup: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child (0-12)</SelectItem>
                    <SelectItem value="adult">Adult (13-60)</SelectItem>
                    <SelectItem value="elderly">Elderly (60+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Health Condition</Label>
                <Select value={formData.condition} onValueChange={(v: any) => setFormData(p => ({...p, condition: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="asthma">Asthma/Respiratory</SelectItem>
                    <SelectItem value="sensitive">Sensitive Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Planned Outdoor Hours</Label>
              <Input 
                type="number" 
                value={formData.outdoorHours} 
                onChange={(e) => setFormData(p => ({...p, outdoorHours: e.target.value}))}
                min={0} max={24}
              />
            </div>
            <Button onClick={handleSubmit} disabled={isPending} className="w-full font-bold">
              {isPending ? "Analyzing..." : "Generate Safe Schedule"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-xs text-green-700 font-bold uppercase mb-1">Safe Window</div>
                <div className="text-lg font-bold text-green-800 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" /> {plan.safeTimeWindow}
                </div>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="text-xs text-red-700 font-bold uppercase mb-1">Avoid Outdoors</div>
                <div className="text-lg font-bold text-red-800 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {plan.avoidTimeWindow}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-semibold text-sm">Recommended Mask</span>
              <Badge variant={plan.maskLevel === "None" ? "secondary" : "destructive"} className="text-sm px-3 py-1">
                {plan.maskLevel}
              </Badge>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg text-sm text-black leading-relaxed border border-primary/10">
              <span className="font-bold text-primary block mb-1">Expert Advice:</span>
              {plan.advice}
            </div>
            
            <Button variant="ghost" onClick={() => mutate(undefined as any)} className="w-full text-xs text-muted-foreground">
              Reset Planner
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PollutionReporter({ wardId }: { wardId: number }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pollutionType: "Industrial Emissions",
    subcategory: "",
    description: "",
    severity: "Medium",
    evidence: null as string | null,
  });
  const [isMining, setIsMining] = useState(false);
  const { toast } = useToast();

  const subcategories: Record<string, string[]> = {
    "Industrial Emissions": ["Factory / Industrial smoke", "Power plant emissions", "Brick kilns", "Diesel generator (DG) set emissions", "Chemical / toxic gas release", "Burning in industrial premises"],
    "Vehicular Pollution": ["Excessive vehicle smoke", "Old / unfit vehicles", "Traffic congestion causing pollution", "Idling commercial vehicles", "Construction vehicle dust"],
    "Construction & Road Dust": ["Construction dust (no green net / water sprinkling)", "Demolition dust", "Uncovered construction material", "Road dust / damaged roads", "Soil excavation pollution"],
    "Open Burning": ["Garbage burning", "Plastic burning", "Leaf / biomass burning", "Crop residue / stubble burning", "Scrap / tyre burning"],
    "Waste & Landfill Issues": ["Overflowing garbage dumps", "Landfill gas / odor", "Open waste dumping", "Poor waste segregation causing air pollution"],
    "Odour & Gas Leakage": ["Sewage smell", "Chemical odor", "Landfill smell", "Industrial odor", "Gas leakage (non-emergency)"],
    "Residential & Commercial Smoke": ["Domestic fuel burning (coal/wood)", "Restaurant / dhaba smoke", "Tandoor smoke", "Community bonfire", "Firecrackers"],
    "Hazardous Pollution": ["Asbestos dust", "Medical waste burning", "E-waste burning", "Unknown hazardous fumes", "Air pollution affecting schools / hospitals"],
    "Other": ["Other - Please specify in description"]
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(p => ({ ...p, evidence: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.description || !formData.name || !formData.email) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsMining(true);
    try {
      await pollutionBlockchain.initialize();
      const complaintData = {
        id: `CPL-${Date.now()}`,
        type: 'complaint',
        wardId,
        ...formData,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };
      await pollutionBlockchain.addBlock(complaintData);
      toast({ title: "Success", description: "Report secured on blockchain!" });
      setFormData({ name: "", email: "", phone: "", pollutionType: "Industrial Emissions", subcategory: "", description: "", severity: "Medium", evidence: null });
    } catch (e) {
      toast({ title: "Error", description: "Failed to secure report", variant: "destructive" });
    } finally {
      setIsMining(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-xl overflow-hidden bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="bg-primary/5 pb-6 border-b border-primary/10">
        <CardTitle className="flex items-center gap-2 text-primary">
          <ShieldAlert className="w-6 h-6" /> Blockchain Evidence Portal
        </CardTitle>
        <CardDescription>File immutable pollution reports secured by cryptographic proof.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone (Optional)</Label>
            <Input value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} placeholder="+91..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Pollution Category</Label>
            <Select value={formData.pollutionType} onValueChange={(v) => setFormData(p => ({ ...p, pollutionType: v, subcategory: "" }))}>
              <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(subcategories).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subcategory</Label>
            <Select value={formData.subcategory} onValueChange={(v) => setFormData(p => ({ ...p, subcategory: v }))}>
              <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {subcategories[formData.pollutionType]?.map(sub => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Observed Severity</Label>
            <Select value={formData.severity} onValueChange={(v) => setFormData(p => ({ ...p, severity: v }))}>
              <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low (Visible)</SelectItem>
                <SelectItem value="Medium">Medium (Discomfort)</SelectItem>
                <SelectItem value="High">High (Health Hazard)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100 h-10">
              <MapPin className="w-4 h-4" /> 28.61, 77.20 (Auto)
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Detailed Description</Label>
          <Input 
            placeholder="Describe the pollution event, exact location, and time..." 
            value={formData.description}
            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
            className="bg-background/50 h-20"
          />
        </div>

        <div className="space-y-2">
          <Label>Evidence (Optional)</Label>
          <div 
            onClick={() => document.getElementById('media-upload')?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all",
              formData.evidence ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 bg-muted/20"
            )}
          >
            {formData.evidence ? (
              <img src={formData.evidence} className="h-full w-full object-cover rounded-lg" alt="Preview" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <p className="text-xs font-medium">Click to upload photo</p>
              </>
            )}
            <input type="file" id="media-upload" className="hidden" accept="image/*" onChange={handleMediaUpload} />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isMining} className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20">
          {isMining ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Securing...</> : "File Blockchain Report"}
        </Button>
      </CardContent>
    </Card>
  );
}
