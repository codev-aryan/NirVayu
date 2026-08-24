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
import { SafeLifePlanner } from "./SafeLifePlanner";


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

      {/* Row 3: Lower Section — Ward Intelligence, Travel Planner & Health Risk */}
      {selectedWard ? (
        <div className="space-y-8">
          {/* Ward Header Card (Full Width Banner) */}
          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" /> {t("common.lastUpdated")}: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
              <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
                {selectedWard.name}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge aqi={selectedWard.aqi} />
              <div className="flex items-center gap-2 bg-muted/50 px-3.5 py-1.5 rounded-full border border-border/50 text-xs">
                <SourceIcon source={selectedWard.dominant_source} />
                <span className="font-semibold text-foreground">
                  {t("intel.dominantSource")}: {getLocalizedSource(selectedWard.dominant_source)}
                </span>
              </div>
            </div>
          </div>

          {selectedWard.emergency_mode && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                    {t("common.emergency")}! Severe Pollution Alert in {selectedWard.name}
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Immediate precautions required: Avoid all outdoor exertion & wear N95 masks.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Equal 2-Column Split: Clean Air Navigator (Left) + 7-Day Historic Graph (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6">
              <SafeLifePlanner ward={selectedWard} />
            </div>
            <div className="lg:col-span-6">
              <HistoricAqiChart ward={selectedWard} />
            </div>
          </div>

          {/* Full Width Cigarette & Health Risk Assessment */}
          <div>
            <CigaretteHealthRiskCard
              wardName={selectedWard.name}
              aqi={selectedWard.aqi}
              pm25={selectedWard.pm25}
              dominantSource={selectedWard.dominant_source}
            />
          </div>
        </div>
      ) : (
        <div className="h-[220px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-3xl bg-muted/20">
          <MapPin className="w-8 h-8 text-muted-foreground mb-3" />
          <h3 className="text-base font-bold mb-1">{t("citizen.selectedWard")}</h3>
          <p className="text-muted-foreground text-xs max-w-xs">
            {t("citizen.selectWardPrompt")}
          </p>
        </div>
      )}
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
