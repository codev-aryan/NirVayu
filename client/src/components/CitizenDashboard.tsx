import { useState, useEffect } from "react";
import { useWards, useGeneratePlan, useAddCredit, useSubmitReport } from "@/hooks/use-wards";
import { MapPin, Clock, AlertTriangle, Leaf, ShieldCheck, HeartPulse, Activity, Camera, Trash2, ShieldAlert, CheckCircle2, Upload, Car, Construction, Factory, Wind, Trees, Loader2, Search, Footprints, Compass } from "lucide-react";
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
import { CaptureEvidence } from "./CaptureEvidence";
import { apiRequest } from "@/lib/queryClient";
import { NewsBulletin } from "./NewsBulletin";
import { WardMeasures } from "./WardMeasures";
import { useLanguage } from "@/lib/i18n";
import { AqiScoreCard } from "./AqiScoreCard";
import { CigaretteHealthRiskCard } from "./CigaretteHealthRiskCard";
import { HistoricAqiChart } from "./HistoricAqiChart";

// Map ward coordinates to Delhi zone for zone-based news
function getZone(lat: number, lng: number): string {
  if (lat > 28.73) return "North Delhi";
  if (lat < 28.55) return "South Delhi";
  if (lng > 77.25) return "East Delhi";
  if (lng < 77.10) return "West Delhi";
  return "Central Delhi";
}

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
  const { t } = useLanguage();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOutsideClick = () => setShowSuggestions(false);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!data) return null;
  const { wards, lastUpdated } = data;

  const selectedWard = wards.find(w => w.id === selectedWardId);

  // Overall Delhi AQI matching major active monitoring stations (Anand Vihar, Bawana, Sriniwaspuri)
  const sortedByAqi = [...wards].sort((a, b) => b.aqi - a.aqi);
  const primaryTierIndex = Math.min(sortedByAqi.length - 1, Math.floor(sortedByAqi.length * 0.15));
  const overallAqi = sortedByAqi.length > 0 ? sortedByAqi[primaryTierIndex].aqi : 155;
  const overallPm25 = sortedByAqi.length > 0 ? sortedByAqi[primaryTierIndex].pm25 : 153;
  const overallPm10 = sortedByAqi.length > 0 ? sortedByAqi[primaryTierIndex].pm10 : 112;
  const overallNo2 = sortedByAqi.length > 0 ? sortedByAqi[primaryTierIndex].no2 : 35;

  const filteredWards = searchQuery
    ? wards.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const zone = selectedWard ? getZone(selectedWard.latitude, selectedWard.longitude) : undefined;
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
    <div className="space-y-6">
      {/* News Ticker */}
      <NewsBulletin zone={zone} />

      {/* Row 1: Colorful AQI Score & Core Metrics Card (NO CO2 BUDGET) */}
      <AqiScoreCard
        title={selectedWard ? `${selectedWard.name} — ${t("metric.aqi")}` : t("metric.delhiAvgAqi")}
        aqi={selectedWard ? selectedWard.aqi : overallAqi}
        pm25={selectedWard ? selectedWard.pm25 : overallPm25}
        pm10={selectedWard ? selectedWard.pm10 : overallPm10}
        no2={selectedWard ? selectedWard.no2 : overallNo2}
        o3={selectedWard ? selectedWard.o3 : 45}
      />

      {/* Row 2: Map + Report Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Column */}
        <Card className="lg:col-span-8 border-border shadow-sm overflow-hidden h-[560px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="text-primary" /> {t("citizen.mapTitle")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("citizen.mapSubtitle")}
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t("citizen.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full pl-9 h-9 text-sm"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                </div>
                {showSuggestions && filteredWards.length > 0 && (
                  <div className="absolute z-[1000] w-full bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto mt-1">
                    {filteredWards.map(w => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedWardId(w.id);
                          setSearchQuery(w.name);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors block border-b last:border-b-0"
                      >
                        {w.name} (AQI: {w.aqi})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <div className="relative h-full w-full border-t">
              <WardMap
                wards={wards}
                selectedWardId={selectedWardId || undefined}
                onSelectWard={(id) => {
                  setSelectedWardId(id);
                  const w = wards.find(x => x.id === id);
                  if (w) setSearchQuery(w.name);
                }}
                className="absolute inset-0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Report Panel Column */}
        <div className="lg:col-span-4 h-[560px]">
          {selectedWard ? (
            <ReportPollutionModule selectedWard={selectedWard} />
          ) : (
            <Card className="border-dashed border-2 border-border h-full min-h-[460px] flex flex-col items-center justify-center bg-muted/10">
              <CardContent className="text-center p-8">
                <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-bold mb-1">{t("report.title")}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {t("citizen.selectWardPrompt")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Row 3: Lower Section - Health Info + Daily Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Ward Info & Safe Life Planner */}
        <div className="lg:col-span-5 space-y-6">
          {selectedWard ? (
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 space-y-6">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-2">
                  <Clock className="w-3 h-3" /> {t("common.lastUpdated")}: {new Date(lastUpdated).toLocaleTimeString()}
                </div>
                <h2 className="text-3xl font-display font-bold text-primary mb-1">{selectedWard.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground mt-2">
                  <StatusBadge aqi={selectedWard.aqi} />
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border border-border/50">
                    <SourceIcon source={selectedWard.dominant_source} />
                    <span className="text-sm font-medium">{t("intel.dominantSource")}: {getLocalizedSource(selectedWard.dominant_source)}</span>
                  </div>
                </div>
              </div>

              {selectedWard.emergency_mode && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 shadow-sm relative overflow-hidden"
                >
                  <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" /> {t("common.emergency")}!
                  </h3>
                  <p className="text-red-700 text-sm mb-3">
                    Severe pollution levels detected in {selectedWard.name}. Immediate precautions required.
                  </p>
                  <ul className="text-xs text-red-800 space-y-1 font-medium">
                    <li>• Avoid all outdoor activities</li>
                    <li>• Wear N95 masks if stepping out</li>
                    <li>• Use air purifiers indoors</li>
                  </ul>
                </motion.div>
              )}

              <div className="pt-4 border-t space-y-6">
                <SafeLifePlanner ward={selectedWard} />
                <HistoricAqiChart ward={selectedWard} />
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-3xl bg-muted/20">
              <MapPin className="w-8 h-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-bold mb-2">{t("citizen.selectedWard")}</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                {t("citizen.selectWardPrompt")}
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Cigarette Equivalent & Health Risk Assessments */}
        <div className="lg:col-span-7">
          <CigaretteHealthRiskCard
            wardName={selectedWard?.name}
            aqi={selectedWard ? selectedWard.aqi : overallAqi}
            pm25={selectedWard ? selectedWard.pm25 : overallPm25}
            dominantSource={selectedWard ? selectedWard.dominant_source : "Traffic"}
          />
        </div>
      </div>
    </div>
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

function SafeLifePlanner({ ward }: { ward: any }) {
  const { language } = useLanguage();
  const [tripType, setTripType] = useState<"office" | "school" | "market" | "park">("office");

  const aqi = ward?.aqi || 150;
  const pm25 = ward?.pm25 || Math.round(aqi * 0.6);
  const wardName = ward?.name || "Selected Ward";

  // Dynamic Route Exposure Calculation
  const getRouteMetrics = () => {
    switch (tripType) {
      case "office":
        return {
          dest: language === "hi" ? "ऑफ़िस / कार्यस्थल" : "Office Commute",
          directAqi: Math.round(aqi * 1.25),
          greenAqi: Math.round(aqi * 0.75),
          savingsPercent: "40%",
          greenRouteName: language === "hi" ? "ग्रीन एक्सप्रेस / मेट्रो कॉरिडोर" : "Metro / Green Park Corridor",
          directRouteName: language === "hi" ? "मुख्य रिंग रोड (ट्रैफिक जाम)" : "Arterial Ring Road (Congested)"
        };
      case "school":
        return {
          dest: language === "hi" ? "स्कूल / कॉलेज ड्रॉप" : "School Drop-off",
          directAqi: Math.round(aqi * 1.35),
          greenAqi: Math.round(aqi * 0.65),
          savingsPercent: "52%",
          greenRouteName: language === "hi" ? "सेक्टर सर्विस रोड (कम धुआँ)" : "Inner Sector Service Road",
          directRouteName: language === "hi" ? "बस स्टैंड / बस लेन कॉरिडोर" : "Main Bus Transit Corridor"
        };
      case "market":
        return {
          dest: language === "hi" ? "स्थानीय बाज़ार / खरीदारी" : "Market / Shopping",
          directAqi: Math.round(aqi * 1.2),
          greenAqi: Math.round(aqi * 0.7),
          savingsPercent: "42%",
          greenRouteName: language === "hi" ? "पैदल मॉल कॉम्प्लेक्स / ढकी लेन" : "Covered Pedestrian Arcade",
          directRouteName: language === "hi" ? "खुला बाज़ार (डीजल ऑटो धुआँ)" : "Open Street Market (Diesel Autos)"
        };
      case "park":
        return {
          dest: language === "hi" ? "पार्क / वॉकिंग ट्रैक" : "Park / Fitness Walk",
          directAqi: Math.round(aqi * 1.4),
          greenAqi: Math.round(aqi * 0.6),
          savingsPercent: "57%",
          greenRouteName: language === "hi" ? "वृक्षच्छादित आंतरिक पार्क ट्रेल" : "Tree-Dense Inner Bio-Park",
          directRouteName: language === "hi" ? "सड़क के किनारे का ओपन ट्रैक" : "Roadside Open Footpath"
        };
    }
  };

  const route = getRouteMetrics();

  // Hourly Window Ventilation Index
  const getWindowRadar = () => {
    if (aqi <= 100) {
      return { status: "OPEN", text: language === "hi" ? "ताजी हवा के लिए खिड़कियाँ खुली रखें।" : "Fresh Air! Windows can remain open all day.", color: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" };
    } else if (aqi <= 200) {
      return { status: "TIMED", text: language === "hi" ? "केवल 12:00 PM – 4:00 PM के बीच खिड़कियाँ खोलें (धूप से धुआँ छंटता है)।" : "Open windows ONLY from 12:00 PM – 4:00 PM (sunlight disperses inversion).", color: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" };
    } else {
      return { status: "SEAL", text: language === "hi" ? "खिड़कियाँ पूरी तरह सील रखें! ज़हरीला धुआँ घर के अंदर घुस सकता है।" : "SEAL WINDOWS! Toxic inversion will compromise indoor air quality.", color: "border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200" };
    }
  };

  const windowStatus = getWindowRadar();

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-primary font-bold">
            <Compass className="w-5 h-5 text-primary" />
            {language === "hi" ? `${wardName} — एयर नेविगेटर व होम सेन्चुरी` : `${wardName} — Clean Air Navigator & Home Sanctuary`}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/30 text-primary">
            AQI {aqi}
          </Badge>
        </div>
        <CardDescription className="text-xs mt-0.5">
          {language === "hi" ? "कम प्रदूषण वाला यात्रा मार्ग और घर के अंदर साफ हवा का प्रबंधन" : "Cleanest route optimizer, window ventilation radar & indoor bio-hacks"}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* 1. Interactive Clean Air Route Minimizer */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
              🧭 1. {language === "hi" ? "यात्रा का लक्ष्य चुनें:" : "Cleanest Route Optimizer:"}
            </label>
            <Badge variant="secondary" className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950">
              Save {route.savingsPercent} PM2.5 Intake
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: "office", label: language === "hi" ? "ऑफ़िस" : "Office" },
              { id: "school", label: language === "hi" ? "स्कूल" : "School" },
              { id: "market", label: language === "hi" ? "बाज़ार" : "Market" },
              { id: "park", label: language === "hi" ? "पार्क" : "Park" }
            ].map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={tripType === item.id ? "default" : "outline"}
                className="text-xs h-8 font-bold px-1"
                onClick={() => setTripType(item.id as any)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Route Comparison Display */}
          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                  🟢 {language === "hi" ? "अनुशंसित कम प्रदूषण मार्ग:" : "Recommended Clean Air Route:"}
                </span>
                <span className="font-bold text-emerald-950 dark:text-emerald-100">{route.greenRouteName}</span>
              </div>
              <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1">
                AQI {route.greenAqi}
              </Badge>
            </div>

            <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/30 dark:border-rose-900 flex items-center justify-between text-xs opacity-75">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                  🔴 {language === "hi" ? "भारी प्रदूषण वाला डायरेक्ट मार्ग:" : "High-Exposure Direct Route:"}
                </span>
                <span className="font-semibold text-rose-950 dark:text-rose-200">{route.directRouteName}</span>
              </div>
              <Badge variant="outline" className="border-rose-300 text-rose-700 font-bold text-xs px-2.5 py-0.5">
                AQI {route.directAqi}
              </Badge>
            </div>
          </div>
        </div>

        {/* 2. Live Window Ventilation Radar */}
        <div className="space-y-2">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
            🪟 2. {language === "hi" ? "घर की खिड़की व वेंटिलेशन रडार:" : "Home Window Ventilation Radar:"}
          </label>
          <div className={cn("p-3 rounded-xl border text-xs leading-snug flex items-start gap-2.5", windowStatus.color)}>
            <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 shrink-0 mt-0.5 border-current">
              {windowStatus.status}
            </Badge>
            <p className="text-[11px] font-semibold">{windowStatus.text}</p>
          </div>
        </div>

        {/* 3. Indoor Air Bio-Hack Checklist */}
        <div className="p-3 bg-muted/40 border border-border/50 rounded-xl text-xs space-y-2">
          <span className="font-extrabold text-foreground block uppercase text-[10px] tracking-wider">
            🌿 {language === "hi" ? "कम लागत वाला होम एयर बायो-हैक:" : "Low-Cost Indoor Air Bio-Hacks:"}
          </span>
          <ul className="text-[11px] text-muted-foreground space-y-1 font-medium leading-tight">
            <li>• <strong>{language === "hi" ? "प्राकृतिक पौधे:" : "Natural Air Plants:"}</strong> 2 {language === "hi" ? "अरेका पाम + 1 स्नेक प्लांट प्रति कमरा (35% पीएम2.5 कम करता है)।" : "Areca Palms + 1 Snake Plant per room cuts indoor PM2.5 by ~35%."}</li>
            <li>• <strong>{language === "hi" ? "गीला पोछा नियम:" : "Microfiber Wet Mop:"}</strong> {language === "hi" ? "सूखी झाड़ू न लगाएं; नम पोछे से महीन धूल रोकें।" : "Never dry-sweep indoors; wet mop prevents dust resuspension."}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportPollutionModule({ selectedWard }: { selectedWard: any }) {
  const { t, language } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const submitMutation = useSubmitReport();
  const { toast } = useToast();

  const detectLocation = () => {
    setGettingLocation(true);
    setErrorMsg(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setGettingLocation(false);
          toast({
            title: language === "hi" ? "स्थान का पता चला" : "Location detected",
            description: `Latitude: ${position.coords.latitude.toFixed(4)}, Longitude: ${position.coords.longitude.toFixed(4)}`,
          });
        },
        (error) => {
          console.warn("Geolocation failed, using ward centroid:", error);
          setCoords({
            latitude: selectedWard.latitude,
            longitude: selectedWard.longitude
          });
          setGettingLocation(false);
          toast({
            title: language === "hi" ? "जीपीएस अनुपलब्ध" : "Geolocation failed",
            description: language === "hi" ? `${selectedWard.name} के केंद्र बिंदु का उपयोग किया जा रहा है।` : `Using centroid of ${selectedWard.name} as fallback.`,
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setCoords({
        latitude: selectedWard.latitude,
        longitude: selectedWard.longitude
      });
      setGettingLocation(false);
    }
  };

  useEffect(() => {
    detectLocation();
  }, [selectedWard]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      toast({
        title: language === "hi" ? "फोटो आवश्यक है" : "Image required",
        description: language === "hi" ? "कृपया प्रदूषण की एक फोटो अपलोड करें या खींचें।" : "Please upload or capture a photo of the pollution.",
        variant: "destructive"
      });
      return;
    }

    const reportCoords = coords || {
      latitude: selectedWard.latitude,
      longitude: selectedWard.longitude
    };

    setErrorMsg(null);
    setSuccessData(null);

    submitMutation.mutate(
      {
        mediaBase64: image,
        latitude: reportCoords.latitude,
        longitude: reportCoords.longitude,
        description
      },
      {
        onSuccess: (data) => {
          setSuccessData(data);
          setImage(null);
          setDescription("");
          toast({
            title: language === "hi" ? "रिपोर्ट सफलतापूर्वक जमा हुई" : "Report submitted successfully",
            description: language === "hi" ? "ब्लॉकचेन लेज़र में दर्ज की गई।" : "Logged to the blockchain ledger.",
          });
        },
        onError: (err: any) => {
          setErrorMsg(err.message || "Failed to submit report. The image may have been rejected as irrelevant.");
          toast({
            title: language === "hi" ? "रिपोर्ट अस्वीकृत" : "Report Rejected",
            description: err.message || "AI classified image as irrelevant.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <Card className="border-border shadow-md h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" /> {t("report.title")}
        </CardTitle>
        <CardDescription>
          {t("report.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-y-auto">
        {successData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50/50 border border-green-200 rounded-xl space-y-3 mb-4"
          >
            <div className="flex items-center gap-2 text-green-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>{t("report.success")}</span>
            </div>
            {successData.aiAnalysisStatus === "fallback" && (
              <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Note:</strong> Gemini Vision AI key fallback mode.</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-green-950 bg-background/50 p-3 rounded-lg border border-green-100">
              <div>
                <span className="font-bold block text-green-800">{language === "hi" ? "स्वतः पहचाना गया वार्ड:" : "Auto-Detected Ward:"}</span>
                Ward ID: {successData.report.wardId} ({successData.report.latitude.toFixed(4)}, {successData.report.longitude.toFixed(4)})
              </div>
              <div>
                <span className="font-bold block text-green-800">{language === "hi" ? "वर्गीकरण:" : "Classification:"}</span>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                    {successData.report.pollutionType}
                  </span>
                  <span className="text-muted-foreground">({successData.report.aiConfidence}%)</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <span className="font-bold block text-green-800">{t("common.status")}:</span>
                {t("common.verified")}
              </div>
            </div>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-800 mb-4"
          >
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">{language === "hi" ? "सत्यापन विफल" : "AI Verification Failed"}</span>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>{t("report.uploadPhoto")}</Label>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 bg-muted/20 relative min-h-[180px]">
              {image ? (
                <div className="relative w-full h-[160px]">
                  <img src={image} className="w-full h-full object-cover rounded-lg" alt="Pollution preview" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full h-7 w-7"
                    onClick={() => setImage(null)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-semibold">{t("report.takePhoto")}</span>
                  <span className="text-xs text-muted-foreground">JPEG / PNG (max 10MB)</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t("report.description")}</Label>
            <textarea
              className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={t("report.descPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Geo-Location */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground block">
              {language === "hi" ? "जीपीएस स्थिति" : "Geo-Location Status"}
            </Label>
            <div className="flex items-center gap-2 p-2 bg-muted/30 border rounded-lg">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div className="text-[11px] text-muted-foreground truncate">
                {gettingLocation ? (
                  <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {language === "hi" ? "स्थान खोजा जा रहा है..." : "Fetching GPS..."}</span>
                ) : coords ? (
                  <span>GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</span>
                ) : (
                  <span>{selectedWard.name} ({selectedWard.latitude.toFixed(4)}, {selectedWard.longitude.toFixed(4)})</span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto text-[10px] h-6 px-2 font-bold"
                onClick={detectLocation}
                disabled={gettingLocation}
              >
                {language === "hi" ? "रीफ्रेश" : "Refresh"}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending || !image}
            className="w-full font-bold shadow-md"
          >
            {submitMutation.isPending ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t("report.submitting")}</span>
            ) : (
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {t("report.submitBtn")}</span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
