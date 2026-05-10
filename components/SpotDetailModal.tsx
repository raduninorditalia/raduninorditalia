
import React from 'react';
import { Spot } from '../types';
import { MapPin, Calendar, User, Car, X, Navigation } from 'lucide-react';

interface SpotDetailModalProps {
  spot: Spot;
  onClose: () => void;
}

const SpotDetailModal: React.FC<SpotDetailModalProps> = ({ spot, onClose }) => {
  // Funzione per provare a estrarre il marchio dal modello (semplice split)
  const getBrand = (model: string) => {
    return model.split(' ')[0];
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/98 backdrop-blur-2xl">
      <div className="min-h-full flex items-start md:items-center justify-center p-4">
        <div className="absolute inset-0" onClick={onClose}></div>

        <div className="relative w-full max-w-5xl my-auto animate-in fade-in zoom-in duration-300 flex flex-col md:flex-row bg-panel-gray border border-gray-800 shadow-2xl">
        {/* Pulsante Chiudi Mobile */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full md:hidden"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Immagine (Sinistra su Desktop, Sopra su Mobile) */}
        <div className="flex-1 bg-black flex items-center justify-center relative group">
          <img 
            src={spot.image_data} 
            alt={spot.car_model} 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>

        {/* Info (Destra su Desktop, Sotto su Mobile) */}
        <div className="w-full md:w-96 flex flex-col bg-panel-gray border-l border-gray-900">
          <div className="p-8 flex-1 overflow-y-auto">
            <div className="mb-8">
              <p className="text-brick-red text-[10px] font-bold uppercase tracking-[0.5em] mb-2">Dettaglio Avvistamento</p>
              <h2 className="text-3xl font-brand text-white italic tracking-tighter leading-tight">
                {spot.car_model.toUpperCase()}
              </h2>
            </div>

            <div className="space-y-6">
              {/* Marchio */}
              <div className="flex items-start gap-4 p-4 bg-black/20 border border-gray-900">
                <div className="p-2 bg-brick-red/10 rounded">
                  <Car className="w-5 h-5 text-brick-red" />
                </div>
                <div>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-1">Marchio</p>
                  <p className="text-sm text-white font-medium uppercase tracking-wider">{getBrand(spot.car_model)}</p>
                </div>
              </div>

              {/* Luogo */}
              <div className="flex items-start gap-4 p-4 bg-black/20 border border-gray-900">
                <div className="p-2 bg-brick-red/10 rounded">
                  <MapPin className="w-5 h-5 text-brick-red" />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-1">Luogo</p>
                  <p className="text-sm text-white font-medium">{spot.location}</p>
                  {spot.location_data?.lat && (
                    <a 
                      href={`https://www.google.com/maps?q=${spot.location_data.lat},${spot.location_data.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[9px] text-brick-red font-bold uppercase tracking-widest hover:underline"
                    >
                      <Navigation className="w-3 h-3" /> Vedi su Mappa
                    </a>
                  )}
                </div>
              </div>

              {/* Data */}
              <div className="flex items-start gap-4 p-4 bg-black/20 border border-gray-900">
                <div className="p-2 bg-brick-red/10 rounded">
                  <Calendar className="w-5 h-5 text-brick-red" />
                </div>
                <div>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-1">Data</p>
                  <p className="text-sm text-white font-medium">{new Date(spot.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Spotter */}
              <div className="flex items-start gap-4 p-4 bg-black/20 border border-gray-900">
                <div className="p-2 bg-brick-red/10 rounded">
                  <User className="w-5 h-5 text-brick-red" />
                </div>
                <div>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-1">Spotter</p>
                  <p className="text-sm text-white font-bold uppercase tracking-widest">{spot.spotted_by}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Modal */}
          <div className="p-6 border-t border-gray-900 bg-black/20 flex justify-between items-center">
            <button 
              onClick={onClose}
              className="w-full py-3 bg-gray-900 text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:bg-brick-red hover:text-white transition-all"
            >
              Chiudi Dettaglio
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default SpotDetailModal;
