
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Search, X } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number; address?: string };
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  onClose: () => void;
}

const LocationMarker = ({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const ChangeView = ({ center }: { center: L.LatLngExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({ initialLocation, onLocationSelect, onClose }) => {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLocation ? new L.LatLng(initialLocation.lat, initialLocation.lng) : null
  );
  const [searchQuery, setSearchQuery] = useState(initialLocation?.address || '');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : [45.4642, 9.1900] // Default to Milan
  );

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos = new L.LatLng(parseFloat(lat), parseFloat(lon));
        setPosition(newPos);
        setMapCenter([newPos.lat, newPos.lng]);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalizzazione non supportata dal tuo browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
        setPosition(newPos);
        setMapCenter([newPos.lat, newPos.lng]);
        const address = await reverseGeocode(newPos.lat, newPos.lng);
        setSearchQuery(address);
      },
      (err) => {
        alert("Errore nel recupero della posizione: " + err.message);
      }
    );
  };

  const handleConfirm = async () => {
    if (!position) return;
    const address = await reverseGeocode(position.lat, position.lng);
    onLocationSelect({ lat: position.lat, lng: position.lng, address });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-panel-gray border border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brick-red" />
            Seleziona Posizione
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca via, città o paese..."
                className="w-full bg-black border border-gray-800 p-3 pl-10 text-sm text-white outline-none focus:border-brick-red"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-gray-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-700 transition-colors"
            >
              Cerca
            </button>
          </form>

          <div className="h-[300px] w-full bg-black border border-gray-800 relative z-0">
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={position} setPosition={setPosition} />
              <ChangeView center={mapCenter} />
            </MapContainer>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={useCurrentLocation}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-800 text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-gray-600 transition-all"
            >
              <Navigation className="w-3 h-3" />
              Usa Posizione Attuale
            </button>
            <button
              onClick={handleConfirm}
              disabled={!position}
              className={`flex-1 py-3 bg-brick-red text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all ${!position ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-brick-red/20'}`}
            >
              Conferma Posizione
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
