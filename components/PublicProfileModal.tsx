
import React from 'react';
import { Spot, User } from '../types';
import { MapPin, X } from 'lucide-react';

interface PublicProfileModalProps {
  user: any;
  spots: Spot[];
  onClose: () => void;
  onSpotClick: (spot: Spot) => void;
}

const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ user, spots, onClose, onSpotClick }) => {
  const userSpots = spots.filter(s => s.spotted_by === user.username);

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/95 backdrop-blur-xl">
      <div className="min-h-full flex items-start md:items-center justify-center p-4">
        <div className="absolute inset-0" onClick={onClose}></div>

        <div className="relative w-full max-w-4xl my-auto animate-in fade-in zoom-in duration-300 flex flex-col bg-panel-gray border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-900 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-brick-red/10 border border-brick-red/20 flex items-center justify-center text-brick-red text-2xl font-bold uppercase tracking-tighter shadow-inner overflow-hidden">
              {user.username?.substring(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-brand text-white italic tracking-tighter">
                {user.username?.toUpperCase()}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em]">
                  {user.role || 'Membro Community'}
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-12">
            <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.6em] flex items-center gap-4 mb-8">
              User Spots <div className="flex-1 h-px bg-gray-900"></div>
            </h3>

            {userSpots.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-gray-800">
                <p className="text-gray-700 uppercase text-[10px] tracking-[0.5em]">Nessun avvistamento pubblicato da questo utente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userSpots.map((spot, idx) => (
                  <div 
                    key={spot.id || idx} 
                    className="bg-black/40 border border-gray-900 overflow-hidden group hover:border-brick-red/30 transition-all cursor-pointer"
                    onClick={() => onSpotClick(spot)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={spot.image_data} 
                        alt={spot.car_model} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                    </div>
                    <div className="p-4">
                      <h4 className="text-white font-bold tracking-tight mb-1">{spot.car_model}</h4>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-brick-red" />
                        {spot.location}
                      </p>
                      <div className="mt-3 pt-3 border-t border-gray-900 flex justify-between items-center">
                        <span className="text-[8px] text-gray-700 font-bold uppercase tracking-widest">
                          {new Date(spot.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/40 border-t border-gray-900 text-center">
          <p className="text-[9px] text-gray-700 uppercase tracking-widest font-bold">Raduni Nord Italia • Community Member Profile</p>
        </div>
      </div>
    </div>
  </div>
);
};

export default PublicProfileModal;
