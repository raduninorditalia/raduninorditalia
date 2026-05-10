
import React, { useState } from 'react';
import { User, Spot } from '../types';
import { UserPlus, UserMinus, MapPin, Grid, Heart, MessageCircle, Users, Loader2 } from 'lucide-react';

interface UserProfileModalProps {
  targetUser: any;
  currentUser: User;
  allUsers: any[];
  spots: Spot[];
  onClose: () => void;
  onFollow: (id: string) => void;
  onUnfollow: (id: string) => void;
  onOpenProfile: (user: any) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  targetUser, 
  currentUser, 
  allUsers,
  spots, 
  onClose, 
  onFollow, 
  onUnfollow,
  onOpenProfile
}) => {
  const [activeView, setActiveView] = useState<'spots' | 'followers' | 'following'>('spots');
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Trova i dati più aggiornati dell'utente target dalla lista globale
  const latestTargetUser = allUsers.find(u => u.id === targetUser.id) || targetUser;
  
  const userSpots = spots.filter(s => s.spotted_by === latestTargetUser.username);
  const isFollowing = currentUser?.following?.includes(latestTargetUser.id);
  
  const followingList = allUsers.filter(u => latestTargetUser.following?.includes(u.id));
  const followersList = allUsers.filter(u => u.following?.includes(latestTargetUser.id));

  const handleFollowAction = async () => {
    if (!currentUser.isLoggedIn) {
      alert("Devi accedere per seguire altri utenti.");
      onClose(); // Chiude il profilo per mostrare la home/login
      return;
    }
    
    setIsActionLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow(latestTargetUser.id);
      } else {
        await onFollow(latestTargetUser.id);
      }
    } catch (err) {
      console.error("Errore durante l'azione segui:", err);
      alert("Si è verificato un errore. Controlla la configurazione del database.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-xl">
      <div className="min-h-full flex items-start md:items-center justify-center p-4">
        <div className="absolute inset-0" onClick={onClose}></div>

        <div className="relative w-full max-w-2xl my-auto animate-in fade-in zoom-in duration-300 flex flex-col bg-panel-gray border border-gray-800 shadow-2xl">
        {/* Header / Profile Info */}
        <div className="p-8 border-b border-gray-900">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-brick-red to-orange-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-brick-red/20 border-4 border-black">
                {latestTargetUser.username[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-brand text-white italic tracking-tighter mb-1">
                  {latestTargetUser.username.toUpperCase()}
                </h2>
                <p className="text-[10px] font-bold text-brick-red uppercase tracking-[0.3em]">{latestTargetUser.role}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="flex gap-8 mb-8">
            <button 
              onClick={() => setActiveView('spots')}
              className={`text-center group transition-all ${activeView === 'spots' ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
            >
              <p className={`font-bold text-lg leading-none ${activeView === 'spots' ? 'text-brick-red' : 'text-white'}`}>{userSpots.length}</p>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Spot</p>
            </button>
            <button 
              onClick={() => setActiveView('followers')}
              className={`text-center group transition-all ${activeView === 'followers' ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
            >
              <p className={`font-bold text-lg leading-none ${activeView === 'followers' ? 'text-brick-red' : 'text-white'}`}>{followersList.length}</p>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Follower</p>
            </button>
            <button 
              onClick={() => setActiveView('following')}
              className={`text-center group transition-all ${activeView === 'following' ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
            >
              <p className={`font-bold text-lg leading-none ${activeView === 'following' ? 'text-brick-red' : 'text-white'}`}>{followingList.length}</p>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-1">Seguiti</p>
            </button>
          </div>

          {currentUser.id !== latestTargetUser.id && (
            <button 
              onClick={handleFollowAction}
              disabled={isActionLoading}
              className={`w-full py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                isFollowing 
                ? 'bg-gray-800 text-white hover:bg-gray-700' 
                : 'bg-brick-red text-white hover:brightness-110 shadow-lg shadow-brick-red/20'
              } ${isActionLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isActionLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Salvataggio...</span>
                </div>
              ) : isFollowing ? (
                <><UserMinus className="w-4 h-4" /> Smetti di seguire</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Segui</>
              )}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-1 bg-black/20">
          {activeView === 'spots' && (
            <>
              <div className="flex items-center gap-2 p-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest border-b border-gray-900 mb-1">
                <Grid className="w-3 h-3" />
                <span>Post Pubblicati</span>
              </div>
              
              {userSpots.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-[10px] text-gray-700 uppercase tracking-[0.4em]">Nessun contenuto ancora pubblicato.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {userSpots.map((spot, idx) => (
                    <div key={spot.id || idx} className="aspect-square relative group cursor-pointer overflow-hidden">
                      <img 
                        src={spot.image_data} 
                        alt={spot.car_model} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1 text-white">
                          <Heart className={`w-4 h-4 ${spot.likes?.includes(currentUser?.id || '') ? 'fill-brick-red text-brick-red' : 'fill-white'}`} />
                          <span className="text-xs font-bold">{spot.likes?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span className="text-xs font-bold">0</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {(activeView === 'followers' || activeView === 'following') && (
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">
                <Users className="w-3 h-3" />
                <span>{activeView === 'followers' ? 'Persone che lo seguono' : 'Persone seguite'}</span>
              </div>
              
              {(activeView === 'followers' ? followersList : followingList).length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-[10px] text-gray-700 uppercase tracking-[0.4em]">Nessun utente in questa lista.</p>
                </div>
              ) : (
                (activeView === 'followers' ? followersList : followingList).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-black/40 border border-gray-800 hover:border-gray-700 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white tracking-widest">{u.username}</p>
                        <p className="text-[8px] text-gray-600 uppercase tracking-widest">{u.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onOpenProfile(u)}
                      className="text-[9px] font-bold text-brick-red hover:underline uppercase tracking-widest"
                    >
                      Vedi Profilo
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default UserProfileModal;
