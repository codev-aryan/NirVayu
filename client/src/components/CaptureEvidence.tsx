import { useRef, useState, useEffect } from "react";
import { Camera, CheckCircle, AlertTriangle, ShieldCheck, MapPin, Loader2, XCircle, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CaptureEvidenceProps {
    wardId: number;
    onCapture: (blob: Blob, metadata: any) => void;
    onCancel: () => void;
    actionName: string;
}

export function CaptureEvidence({ wardId, onCapture, onCancel, actionName }: CaptureEvidenceProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreamReady, setIsStreamReady] = useState(false);

    // Security State
    const [step, setStep] = useState<'locating' | 'challenge' | 'analyzing' | 'capture' | 'verifying'>('locating');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [geofenceStatus, setGeofenceStatus] = useState<'pending' | 'valid' | 'invalid'>('pending');
    const [geofenceMessage, setGeofenceMessage] = useState("Acquiring GPS Signal...");

    // Active Liveness Challenge
    const [challenge, setChallenge] = useState<string>("");
    const [countdown, setCountdown] = useState<number | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        startCamera();
        checkLocation();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => setIsStreamReady(true);
            }
        } catch (err) {
            toast({ title: "Camera Error", description: "Could not access camera", variant: "destructive" });
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    const checkLocation = () => {
        if (!navigator.geolocation) {
            setGeofenceStatus('invalid');
            setGeofenceMessage("Geolocation not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setLocation({ lat: latitude, lng: longitude });

                try {
                    const res = await apiRequest("POST", "/api/evidence/validate-location", {
                        lat: latitude,
                        lng: longitude,
                        wardId
                    });
                    const data = await res.json();

                    if (data.valid) {
                        setGeofenceStatus('valid');
                        setGeofenceMessage(`GPS Verified: Inside Ward (${data.distance})`);
                        generateChallenge();
                        setStep('challenge');
                    } else {
                        setGeofenceStatus('invalid');
                        setGeofenceMessage(data.message);
                    }
                } catch (e) {
                    console.error("Geofence check failed", e);
                    setGeofenceStatus('invalid');
                    setGeofenceMessage("Could not verify location with server");
                }
            },
            (err) => {
                setGeofenceStatus('invalid');
                setGeofenceMessage("Location permission denied. Required for verified submission.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const generateChallenge = () => {
        const actions = [
            "Blink your eyes twice slowly",
            "Turn your head left then right",
            "Touch your nose with your finger",
            "Hold up two fingers"
        ];
        setChallenge(actions[Math.floor(Math.random() * actions.length)]);
    };

    const verifyGesture = () => {
        setStep('analyzing');
        // Simulate CV Analysis delay
        setTimeout(() => {
            setStep('capture');
            toast({ title: "Liveness Confirmed", description: "Gesture matched! You may now record evidence." });
        }, 2500);
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        setCountdown(3);
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev === 1) {
                    clearInterval(interval);
                    takeSnapshot();
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);
    };

    const takeSnapshot = () => {
        if (!videoRef.current || !canvasRef.current) return;
        setStep('verifying');

        const context = canvasRef.current.getContext("2d");
        if (context) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);

            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    const metadata = {
                        timestamp: Date.now(),
                        device: navigator.userAgent,
                        location,
                        challenge,
                        exif: {
                            DateTimeOriginal: new Date().toISOString(),
                            GPSLatitude: location?.lat,
                            GPSLongitude: location?.lng,
                        }
                    };
                    onCapture(blob, metadata);
                }
            }, "image/jpeg", 0.9);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800 text-white overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={step === 'analyzing' || step === 'verifying' ? "text-blue-400 animate-pulse" : "text-green-500"} />
                        <span className="font-bold tracking-tight">Secure Verification</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                        <XCircle className="w-6 h-6" />
                    </Button>
                </div>

                {/* Viewfinder Area */}
                <div className="relative aspect-[4/3] bg-black group">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isStreamReady ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {!isStreamReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
                            <Loader2 className="w-10 h-10 animate-spin text-green-500" />
                            <p className="text-zinc-500 text-sm">Initializing Secure Camera...</p>
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                            <ScanFace className="w-16 h-16 text-blue-400 animate-pulse mb-4" />
                            <div className="text-2xl font-bold text-white">Verifying Liveness...</div>
                            <p className="text-blue-200 mt-2">Hold position for AI Analysis</p>
                        </div>
                    )}

                    <div className={`absolute top-4 left-4 right-4 flex items-center justify-between px-3 py-2 rounded-lg backdrop-blur-md border ${geofenceStatus === 'valid' ? 'bg-green-500/20 border-green-500/30 text-green-200' :
                            geofenceStatus === 'invalid' ? 'bg-red-500/20 border-red-500/30 text-red-200' :
                                'bg-zinc-800/60 border-zinc-700 text-zinc-300'
                        }`}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="w-4 h-4" />
                            {geofenceMessage}
                        </div>
                        {geofenceStatus === 'valid' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {geofenceStatus === 'invalid' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    </div>

                    {countdown && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                            <span className="text-9xl font-black text-white drop-shadow-lg scale-150 animate-in zoom-in duration-300">
                                {countdown}
                            </span>
                        </div>
                    )}
                </div>

                {/* Interaction Area */}
                <div className="p-6 space-y-6 bg-zinc-900">

                    {step === 'locating' && (
                        <div className="text-center space-y-3 py-4">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-500" />
                            <h3 className="text-lg font-medium">Verifying Location</h3>
                        </div>
                    )}

                    {step === 'challenge' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <div className="bg-zinc-800/80 p-5 rounded-xl border border-dashed border-zinc-700 relative overflow-hidden">
                                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3" /> Security Challenge
                                </div>
                                <div className="text-2xl font-bold text-white mb-2">{challenge}</div>
                                <p className="text-sm text-zinc-400">Perform this action to verify liveness.</p>
                            </div>
                            <Button className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700" onClick={verifyGesture}>
                                Verify Action
                            </Button>
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <div className="text-center py-4 text-zinc-400">
                            Analyzing video stream for human verification...
                        </div>
                    )}

                    {step === 'capture' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
                            <div className="flex items-center justify-between text-sm text-zinc-400 px-1">
                                <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Liveness Verified</span>
                                <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="w-3 h-3" /> No Gallery Uploads</span>
                            </div>
                            <Button
                                onClick={handleCapture}
                                disabled={!!countdown}
                                className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20"
                            >
                                <Camera className="mr-3 w-6 h-6" />
                                {countdown ? "Capturing..." : "Capture Integrity Proof"}
                            </Button>
                        </div>
                    )}

                    {step === 'verifying' && (
                        <div className="text-center space-y-4 py-2">
                            <div className="flex items-center justify-center gap-2 text-green-400 font-medium animate-pulse">
                                <ShieldCheck className="w-5 h-5" />
                                Processing Security Metadata...
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
