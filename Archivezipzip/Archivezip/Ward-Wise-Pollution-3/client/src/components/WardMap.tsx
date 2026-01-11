import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type Ward } from "@shared/schema";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface WardMapProps {
  wards: Ward[];
  selectedWardId?: number;
  onSelectWard: (id: number) => void;
  className?: string;
  interactive?: boolean;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export function WardMap({ wards, selectedWardId, onSelectWard, className, interactive = true }: WardMapProps) {
  const defaultCenter: [number, number] = [28.6139, 77.2090]; // Delhi approximate
  const selectedWard = wards.find(w => w.id === selectedWardId);
  const mapCenter = selectedWard ? [selectedWard.latitude, selectedWard.longitude] as [number, number] : defaultCenter;

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "#22c55e"; // green
    if (aqi <= 100) return "#eab308"; // yellow
    if (aqi <= 200) return "#f97316"; // orange
    if (aqi <= 300) return "#dc2626"; // red
    return "#7e22ce"; // purple/maroon
  };

  return (
    <div className={cn("rounded-xl overflow-hidden shadow-inner border border-border/50 bg-muted/20 relative z-0", className)}>
      <MapContainer 
        center={mapCenter} 
        zoom={12} 
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        style={{ width: "100%", height: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={mapCenter} />
        
        {wards.map((ward) => (
          <CircleMarker
            key={ward.id}
            center={[ward.latitude, ward.longitude]}
            radius={ward.id === selectedWardId ? 24 : 16}
            pathOptions={{
              color: getAQIColor(ward.aqi),
              fillColor: getAQIColor(ward.aqi),
              fillOpacity: ward.id === selectedWardId ? 0.8 : 0.5,
              weight: ward.id === selectedWardId ? 4 : 2
            }}
            eventHandlers={{
              click: () => onSelectWard(ward.id),
            }}
          >
            <Popup className="font-sans">
              <div className="text-sm font-bold">{ward.name}</div>
              <div className="text-xs">AQI: {ward.aqi}</div>
              {ward.emergency_mode && <div className="text-xs text-red-600 font-bold mt-1">EMERGENCY</div>}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
