
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { MapPin, Navigation, Search, Trash2, X } from 'lucide-react';
import Header from './components/Header';
import Hero from './components/Hero';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import AddSpotModal from './components/AddSpotModal';
import PublicProfileModal from './components/PublicProfileModal';
import LocationPicker from './components/LocationPicker';
import SpotDetailModal from './components/SpotDetailModal';
import { View, UserRole, User, Location, Spot } from './types';
import { db } from './services/db';
import { db as firestore } from './firebase';
import { identifyCarFromImage } from './services/geminiService';
import { compressImage } from './lib/imageUtils';

const UserSearchResultItem: React.FC<{ result: any; onClick: () => void }> = ({ result, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-black/40 border border-gray-900 hover:border-gray-700 transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-brick-red/10 border border-brick-red/20 flex items-center justify-center text-brick-red font-bold uppercase tracking-tighter">
          {result.username?.substring(0, 2)}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-brick-red transition-colors">{result.username}</h4>
          <p className="text-[9px] text-gray-600 uppercase tracking-widest">{result.role || 'User'}</p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  console.log("App component initializing...");
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddSpotModalOpen, setIsAddSpotModalOpen] = useState(false);
  const [selectedPublicUser, setSelectedPublicUser] = useState<any | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [user, setUser] = useState<User>({ isLoggedIn: false });
  
  const [events, setEvents] = useState<any[]>([]);
  const [spots, setSpots] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showSyncWarning, setShowSyncWarning] = useState(false);

  const sortedUsers = React.useMemo(() => {
    const rolePriority: Record<string, number> = {
      [UserRole.ADMIN]: 1,
      [UserRole.ORGANIZER]: 2,
      [UserRole.USER]: 3,
    };
    
    return [...allUsers].sort((a, b) => {
      const priorityA = rolePriority[a.role] || 4;
      const priorityB = rolePriority[b.role] || 4;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return (a.username || '').localeCompare(b.username || '');
    });
  }, [allUsers]);
  
  const [spotToDelete, setSpotToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isUserSearchSubmitted, setIsUserSearchSubmitted] = useState(false);

  // Body scroll lock when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isAuthModalOpen || isProfileModalOpen || !!selectedPublicUser || !!selectedSpot || isAddSpotModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAuthModalOpen, isProfileModalOpen, selectedPublicUser, selectedSpot, isAddSpotModalOpen]);
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [formPaidVisitors, setFormPaidVisitors] = useState(false);
  const [formPaidExhibitors, setFormPaidExhibitors] = useState(false);
  const [eventPosterPreview, setEventPosterPreview] = useState<string | null>(null);
  const [eventPosterBase64, setEventPosterBase64] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  
  const eventPosterRef = useRef<HTMLInputElement>(null);

  const [cloudStatus, setCloudStatus] = useState<'connected' | 'local' | 'error'>('connected');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test connection to Firestore - using any public path
        // We don't care if it exists or if we have permission, 
        // as long as it's not a transport error.
        await getDocFromServer(doc(firestore, '_ping_', 'status'));
        setCloudStatus('connected');
      } catch (err: any) {
        // If we get an error, check if it's a connectivity error
        // 'not-found' and 'permission-denied' both mean we reached the server.
        if (err.code === 'not-found' || err.code === 'permission-denied' || err.code === 'unauthenticated') {
          setCloudStatus('connected');
        } else if (err.message?.includes('offline') || err.code === 'unavailable') {
          setCloudStatus('local');
        } else {
          // For other errors, we are likely connected but something else is wrong
          setCloudStatus('connected');
        }
      }
    };

    testConnection();
    
    const session = db.auth.getSession();
    if (session && session.username) {
      setUser({ 
        isLoggedIn: true, 
        username: session.username, 
        role: session.role as UserRole,
        id: session.id,
        email: session.email
      });
    }

    // Real-time listeners
    const unsubscribeSpots = db.subscribeToSpots((data) => setSpots(data));
    const unsubscribeEvents = db.subscribeToEvents((data) => setEvents(data));
    
    let unsubscribeUsers: (() => void) | undefined;
    if (user.role === UserRole.ADMIN) {
      unsubscribeUsers = db.subscribeToUsers((data) => setAllUsers(data));
    }

    return () => {
      unsubscribeSpots();
      unsubscribeEvents();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [user.role, user.isLoggedIn]);

  const handleLogin = async (userData: any) => {
    if (!userData) return;
    setUser({ 
      isLoggedIn: true, 
      username: userData.username, 
      role: userData.role as UserRole,
      id: userData.id,
      email: userData.email
    });
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    db.auth.logout();
    setUser({ isLoggedIn: false, username: '', role: UserRole.USER });
    setCurrentView(View.HOME);
    setIsProfileModalOpen(false);
  };

  const handleRetryConnection = async () => {
    window.location.reload();
  };
  
  const handleOpenAddSpot = () => {
    if (!user.isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsAddSpotModalOpen(true);
  };

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      setIsUserSearchSubmitted(false);
      return;
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSearchQuery.trim()) return;
    
    setIsSearchingUsers(true);
    setIsUserSearchSubmitted(true);
    try {
      const results = await db.users.search(userSearchQuery);
      setUserSearchResults(results);
    } catch (err) {
      console.error("User search error:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    try {
      await db.spots.delete(spotId);
      setSpots(prev => prev.filter(s => s.id !== spotId));
      setSpotToDelete(null);
    } catch (err) {
      alert("Errore durante l'eliminazione dello spot.");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const paidVisitors = formData.get('paid_visitors') === 'on';
    const paidExhibitors = formData.get('paid_exhibitors') === 'on';
    const regLinkVisitors = formData.get('reg_link_visitors') as string;
    const regLinkExhibitors = formData.get('reg_link_exhibitors') as string;
    const regAtEntranceVisitors = formData.get('reg_at_entrance_visitors') === 'on';
    const regAtEntranceExhibitors = formData.get('reg_at_entrance_exhibitors') === 'on';

    // Validation
    if (paidVisitors && !regLinkVisitors && !regAtEntranceVisitors) {
      alert("Per eventi a pagamento (Visitatori), inserire un link di registrazione o spuntare 'Registrazione all'ingresso'.");
      return;
    }
    if (paidExhibitors && !regLinkExhibitors && !regAtEntranceExhibitors) {
      alert("Per eventi a pagamento (Espositori), inserire un link di registrazione o spuntare 'Registrazione all'ingresso'.");
      return;
    }

    const eventData = {
      title: formData.get('title') as string,
      start_date: formData.get('start_date') as string,
      start_time: formData.get('start_time') as string,
      end_date: formData.get('end_date') as string,
      end_time: formData.get('end_time') as string,
      address: formData.get('address') as string,
      maps_link: formData.get('maps_link') as string,
      instagram_post_link: formData.get('instagram_post_link') as string,
      is_dynamic: formData.get('is_dynamic') === 'on',
      paid_visitors: paidVisitors,
      paid_exhibitors: paidExhibitors,
      reg_at_entrance_visitors: regAtEntranceVisitors,
      reg_at_entrance_exhibitors: regAtEntranceExhibitors,
      reg_link_visitors: regLinkVisitors,
      reg_link_exhibitors: regLinkExhibitors,
      description: formData.get('description') as string,
      poster_url: eventPosterBase64 || undefined,
      created_by: user.id || 'unknown'
    };

    try {
      setIsCreatingEvent(true);
      await db.events.create(eventData);
      setShowEventForm(false);
      setFormPaidVisitors(false);
      setFormPaidExhibitors(false);
      setEventPosterPreview(null);
      setEventPosterBase64(null);
    } catch (err) {
      alert("Errore nella creazione dell'evento.");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleEventPosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const compressed = await compressImage(base64, 1200, 1600, 0.7, 800);
        setEventPosterBase64(compressed);
        setEventPosterPreview(compressed);
      } catch (err) {
        console.error("Event poster compression error:", err);
        setErrorMessage("Errore durante la compressione della locandina. Riprova con un'immagine più piccola.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-light-gray font-sans selection:bg-brick-red selection:text-white">
      <Header 
        onOpenAuth={() => setIsAuthModalOpen(true)} 
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        user={user}
        cloudStatus={cloudStatus}
        onNavigateHome={() => {
          setCurrentView(View.HOME);
          setShowEventForm(false);
        }}
        onOpenAdmin={async () => {
          setCurrentView(View.ADMIN_PANEL);
          if (user.role === UserRole.ADMIN) {
            setShowSyncWarning(false);
          }
        }}
        onRetryConnection={handleRetryConnection}
      />

      <main className="pt-24 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
        {errorMessage && (
          <div className="mb-8 p-3 bg-orange-500/10 border border-orange-500/30 text-orange-500 text-center text-[9px] font-bold uppercase tracking-widest animate-pulse">
            {errorMessage}
          </div>
        )}

        {currentView === View.HOME && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-12">
              <p className="text-brick-red uppercase tracking-[0.5em] text-[10px] font-bold mb-4">Official Community</p>
              <h2 className="text-2xl md:text-4xl text-white font-brand tracking-tighter mb-4">
                RADUNI NORD ITALIA
              </h2>
              <div className="h-1 w-20 bg-brick-red mx-auto mb-8"></div>
              <p className="max-w-xl mx-auto text-sm text-gray-500 italic">
                La piattaforma numero uno per la gestione e la scoperta di eventi automotive nel Nord Italia. 
                È una buonissima applicazione per il carspotting con riconoscimento veicoli tramite AI completamente gratuita.
              </p>
            </div>
            <Hero onSelectView={(view) => setCurrentView(view)} isLoggedIn={user.isLoggedIn} />
          </div>
        )}

        {currentView === View.CARSPOTTING && (
          <div className="py-4 animate-in fade-in duration-500 max-w-5xl mx-auto relative min-h-[60vh]">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-12 border-b border-gray-900 pb-6 gap-6">
              <h2 className="text-4xl font-brand text-white italic tracking-tighter">SPOT<span className="text-brick-red">TING</span></h2>
              
              <div className="flex flex-1 max-w-2xl items-center gap-4 justify-end">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs group">
                  <input 
                    type="text" 
                    placeholder="Cerca utenti..." 
                    value={userSearchQuery}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    className="w-full bg-black border border-gray-800 py-2 pl-4 pr-10 text-[10px] font-bold uppercase tracking-widest text-white focus:border-brick-red outline-none transition-all"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brick-red transition-colors">
                    <Search className="w-4 h-4" />
                  </button>

                  {/* Search Results Dropdown */}
                  {isUserSearchSubmitted && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-panel-gray border border-gray-800 shadow-2xl z-[60] max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
                      <div className="p-2 border-b border-gray-900 flex justify-between items-center">
                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Risultati: {userSearchResults.length}</span>
                        <button onClick={() => { setUserSearchQuery(''); setUserSearchResults([]); setIsUserSearchSubmitted(false); }} className="text-gray-600 hover:text-white"><X className="w-3 h-3" /></button>
                      </div>
                      {isSearchingUsers ? (
                        <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-brick-red/20 border-t-brick-red rounded-full animate-spin"></div></div>
                      ) : userSearchResults.length === 0 ? (
                        <div className="p-8 text-center text-[9px] text-gray-700 uppercase tracking-widest italic">Nessun utente trovato</div>
                      ) : (
                        <div className="divide-y divide-gray-900">
                          {userSearchResults.map((res, i) => (
                            <UserSearchResultItem 
                              key={res.id || i} 
                              result={res} 
                              onClick={() => {
                                setSelectedPublicUser(res);
                                setUserSearchQuery('');
                                setUserSearchResults([]);
                                setIsUserSearchSubmitted(false);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </form>
                <button onClick={() => setCurrentView(View.HOME)} className="text-[10px] font-bold text-gray-600 hover:text-white uppercase tracking-widest border border-gray-800 px-4 py-2 transition-colors whitespace-nowrap">Torna Home</button>
              </div>
            </div>

            {/* Floating Add Button */}
            <div className="fixed bottom-24 right-6 md:right-12 z-40">
              <button 
                onClick={handleOpenAddSpot}
                className="group relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-brick-red text-white rounded-full shadow-2xl shadow-brick-red/30 hover:scale-110 active:scale-95 transition-all duration-300 transform-gpu"
                title="Aggiungi uno Spot"
              >
                <div className="absolute inset-0 bg-brick-red rounded-full animate-ping opacity-20 pointer-events-none group-hover:block hidden"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>

            <div className="space-y-12">
              <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.6em] flex items-center gap-4">
                Recent Spots <div className="flex-1 h-px bg-gray-900"></div>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {spots.length === 0 ? (
                  <div className="col-span-full py-24 text-center border border-dashed border-gray-800">
                    <p className="text-gray-800 uppercase text-[10px] tracking-[0.5em] mb-4">Nessuno spot in archivio.</p>
                    <button 
                      onClick={handleOpenAddSpot}
                      className="text-[9px] font-bold text-brick-red uppercase tracking-widest hover:underline"
                    >
                      Sii il primo a pubblicare →
                    </button>
                  </div>
                ) : (
                  spots.map((spot, idx) => {
                    const spotId = spot.id || `spot-${idx}`;
                    return (
                      <div key={spotId} className="relative bg-panel-gray border border-gray-800 group hover:border-brick-red/50 transition-all duration-500 overflow-hidden shadow-xl animate-in slide-in-from-bottom-4">
                        <div 
                          className="aspect-video bg-black overflow-hidden relative cursor-pointer"
                          onClick={() => setSelectedSpot(spot)}
                        >
                          <img 
                            src={spot.image_data} 
                            alt={spot.car_model} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          />
                          <div className="absolute top-4 left-4 flex flex-col gap-2">
                            <div className="bg-brick-red text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest">AVVISTAMENTO</div>
                            {spot._source === 'cloud' ? (
                              <div className="bg-green-600 text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                CLOUD
                              </div>
                            ) : (
                              <div className="bg-orange-600 text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                LOCAL
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <h3 
                              className="text-xl font-bold text-white group-hover:text-brick-red transition-colors tracking-tight cursor-pointer"
                              onClick={() => setSelectedSpot(spot)}
                            >
                              {spot.car_model}
                            </h3>
                            <p 
                              className="text-[9px] font-bold text-gray-600 uppercase tracking-widest hover:text-brick-red cursor-pointer transition-colors"
                              onClick={async () => {
                                const spotter = await db.users.findByUsername(spot.spotted_by);
                                if (spotter) setSelectedPublicUser(spotter);
                              }}
                            >
                              {spot.spotted_by}
                            </p>
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 truncate">
                            <MapPin className="w-3 h-3 text-brick-red flex-shrink-0" />
                            {spot.location}
                          </p>
                          <div className="pt-4 border-t border-gray-800 flex justify-between items-center text-[8px] text-gray-700 font-bold uppercase tracking-[0.3em]">
                            <div className="flex items-center gap-4">
                              <span>{new Date(spot.created_at).toLocaleDateString('it-IT')}</span>
                            </div>
                            {(user.role === UserRole.ADMIN || spot.spotted_by === user.username) && (
                              <button 
                                onClick={() => setSpotToDelete(spotId)}
                                className="text-gray-700 hover:text-brick-red transition-colors flex items-center gap-2"
                                title="Elimina Spot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ELIMINA</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Custom Delete Confirmation Overlay */}
                        {spotToDelete === spotId && (
                          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
                            <Trash2 className="w-12 h-12 text-brick-red mb-4" />
                            <h4 className="text-white text-sm font-bold uppercase tracking-[0.2em] mb-2">Confermi l'eliminazione?</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-8">Questa azione è irreversibile.</p>
                            <div className="flex gap-4 w-full">
                              <button 
                                onClick={() => setSpotToDelete(null)}
                                className="flex-1 py-3 border border-gray-800 text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-gray-600 transition-all"
                              >
                                Annulla
                              </button>
                              <button 
                                onClick={() => handleDeleteSpot(spot.id)}
                                className="flex-1 py-3 bg-brick-red text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brick-red/20"
                              >
                                Elimina
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === View.EVENTI && (
          <div className="py-4 animate-in fade-in duration-500 max-w-4xl mx-auto">
             <div className="flex flex-col md:flex-row justify-between md:items-center mb-12 border-b border-gray-900 pb-6 gap-6">
              <div className="flex items-center gap-6">
                <h2 className="text-4xl font-brand text-white italic tracking-tighter leading-none">EVENT<span className="text-brick-red">I</span></h2>
                {(user.role === UserRole.ADMIN || user.role === UserRole.ORGANIZER) && (
                  <button 
                    onClick={() => setShowEventForm(!showEventForm)}
                    className="bg-brick-red text-white text-[9px] font-bold uppercase tracking-widest px-4 py-2 hover:brightness-110 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {showEventForm ? '✕ Annulla' : '+ Crea Evento'}
                  </button>
                )}
              </div>
              <button onClick={() => setCurrentView(View.HOME)} className="self-start md:self-auto text-[10px] font-bold text-gray-600 hover:text-white uppercase tracking-widest border border-gray-800 px-4 py-2 transition-colors">Torna Home</button>
            </div>
            
            {showEventForm && (
              <div className="bg-panel-gray border border-brick-red/30 p-5 mb-8 animate-in slide-in-from-top-4 duration-300 shadow-2xl">
                <h3 className="text-brick-red text-[9px] font-bold uppercase tracking-[0.5em] mb-4">Nuovo Evento</h3>
                <form onSubmit={handleCreateEvent} className="space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Sezione Foto e Impostazioni Base */}
                    <div className="space-y-2">
                      <div 
                        onClick={() => eventPosterRef.current?.click()}
                        className="w-full aspect-[3/4] bg-black border border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:border-brick-red/50 transition-all overflow-hidden relative group"
                      >
                        {eventPosterPreview ? (
                          <img src={eventPosterPreview} alt="Poster Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-700 mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <p className="text-[6px] font-bold text-gray-600 uppercase tracking-widest text-center px-2">Carica Locandina</p>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-[6px] font-bold text-white uppercase tracking-widest">Cambia</p>
                        </div>
                        <input type="file" ref={eventPosterRef} onChange={handleEventPosterChange} accept="image/*" className="hidden" />
                      </div>

                      <div className="p-2 bg-black/20 border border-gray-900 space-y-1.5">
                        <p className="text-[6px] font-bold text-gray-600 uppercase tracking-widest mb-0.5">Tipo & Costi</p>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" name="is_dynamic" className="w-2.5 h-2.5 accent-brick-red bg-black border-gray-800" />
                          <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Dinamico</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name="paid_visitors" 
                            checked={formPaidVisitors}
                            onChange={(e) => setFormPaidVisitors(e.target.checked)}
                            className="w-2.5 h-2.5 accent-brick-red bg-black border-gray-800" 
                          />
                          <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Pagamento Visitatori</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name="paid_exhibitors" 
                            checked={formPaidExhibitors}
                            onChange={(e) => setFormPaidExhibitors(e.target.checked)}
                            className="w-2.5 h-2.5 accent-brick-red bg-black border-gray-800" 
                          />
                          <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Pagamento Espositori</span>
                        </label>
                      </div>
                    </div>

                    {/* Dettagli Principali */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="md:col-span-2">
                        <InputField label="Titolo Evento" name="title" placeholder="Es: Night Drive Milano" required />
                      </div>
                      <InputField label="Giorno Inizio" name="start_date" type="date" required />
                      <InputField label="Ora Inizio" name="start_time" type="time" required />
                      <InputField label="Giorno Fine" name="end_date" type="date" required />
                      <InputField label="Ora Fine" name="end_time" type="time" required />
                      
                      <div className="md:col-span-2">
                        <InputField label="Indirizzo Completo" name="address" placeholder="Via, Paese, Prov, Civico o Parcheggio" required />
                      </div>
                      <InputField label="Link Google Maps con pos. evento" name="maps_link" placeholder="https://maps.google.com/..." required />
                      <InputField label="Link Instagram della locandina" name="instagram_post_link" placeholder="https://www.instagram.com/p/..." />

                      <div className={`p-2.5 bg-black/20 border border-gray-900 space-y-1.5 transition-opacity ${!formPaidVisitors ? 'opacity-40' : 'opacity-100'}`}>
                        <p className="text-[6px] font-bold text-gray-600 uppercase tracking-widest">Registrazione Visitatori</p>
                        <InputField 
                          label="Link Online" 
                          name="reg_link_visitors" 
                          placeholder={formPaidVisitors ? "https://..." : "Abilita pagamento per inserire link"} 
                          disabled={!formPaidVisitors}
                        />
                        <label className={`flex items-center gap-2 cursor-pointer group ${!formPaidVisitors ? 'pointer-events-none' : ''}`}>
                          <input 
                            type="checkbox" 
                            name="reg_at_entrance_visitors" 
                            disabled={!formPaidVisitors}
                            className="w-2.5 h-2.5 accent-brick-red bg-black border-gray-800" 
                          />
                          <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">All'ingresso</span>
                        </label>
                      </div>
                      
                      <div className={`p-2.5 bg-black/20 border border-gray-900 space-y-1.5 transition-opacity ${!formPaidExhibitors ? 'opacity-40' : 'opacity-100'}`}>
                        <p className="text-[6px] font-bold text-gray-600 uppercase tracking-widest">Registrazione Espositori</p>
                        <InputField 
                          label="Link Online" 
                          name="reg_link_exhibitors" 
                          placeholder={formPaidExhibitors ? "https://..." : "Abilita pagamento per inserire link"} 
                          disabled={!formPaidExhibitors}
                        />
                        <label className={`flex items-center gap-2 cursor-pointer group ${!formPaidExhibitors ? 'pointer-events-none' : ''}`}>
                          <input 
                            type="checkbox" 
                            name="reg_at_entrance_exhibitors" 
                            disabled={!formPaidExhibitors}
                            className="w-2.5 h-2.5 accent-brick-red bg-black border-gray-800" 
                          />
                          <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">All'ingresso</span>
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Descrizione Breve</label>
                        <textarea 
                          name="description"
                          placeholder="Descrivi l'evento in poche parole..."
                          required
                          className="w-full bg-black border border-gray-800 p-2 text-white focus:border-brick-red outline-none transition-colors text-xs h-12 placeholder:text-gray-800"
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end gap-3 border-t border-gray-900">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowEventForm(false);
                        setFormPaidVisitors(false);
                        setFormPaidExhibitors(false);
                      }}
                      className="px-4 py-2 text-[8px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                    >
                      Annulla
                    </button>
                    <button 
                      type="submit" 
                      disabled={isCreatingEvent}
                      className="w-full md:w-32 bg-brick-red text-white py-2 text-[9px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brick-red/20 disabled:opacity-50"
                    >
                      {isCreatingEvent ? 'Invio...' : 'Pubblica'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-8">
              {events.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-gray-800">
                  <p className="text-gray-800 uppercase text-[10px] tracking-[0.5em]">Calendario in aggiornamento...</p>
                </div>
              ) : (
                events.map((event, idx) => {
                  const startDate = new Date(event.start_date);
                  const endDate = new Date(event.end_date);
                  const isSameDay = event.start_date === event.end_date;
                  
                  return (
                    <div key={event.id || `event-${idx}`} className="bg-panel-gray border border-gray-800 hover:border-brick-red/40 transition-all group shadow-lg relative overflow-hidden flex flex-col md:flex-row">
                      {/* Immagine Locandina */}
                      <div className="w-full md:w-56 aspect-[3/4] bg-black overflow-hidden relative">
                        {event.poster_url ? (
                          <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-900">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        )}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <span className="bg-brick-red text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest">NORD ITALIA</span>
                          {event._source === 'cloud' ? (
                            <span className="bg-green-600 text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                              CLOUD
                            </span>
                          ) : (
                            <span className="bg-orange-600 text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                              LOCAL
                            </span>
                          )}
                          <span className={`${event.is_dynamic ? 'bg-blue-600' : 'bg-gray-700'} text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest`}>
                            {event.is_dynamic ? 'DINAMICO' : 'STATICO'}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 p-8 flex flex-col">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                               <span className="text-[10px] text-brick-red font-bold uppercase tracking-widest">
                                 {startDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                 {!isSameDay && ` - ${endDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`}
                               </span>
                               <span className="text-gray-800">•</span>
                               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{event.start_time} - {event.end_time}</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white uppercase tracking-tighter group-hover:text-brick-red transition-colors">{event.title}</h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {event.paid_visitors ? (
                              <span className="text-[8px] font-bold bg-brick-red/10 text-brick-red border border-brick-red/20 px-2 py-1 uppercase tracking-widest">A PAGAMENTO (VISITATORI)</span>
                            ) : (
                              <span className="text-[8px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 uppercase tracking-widest">GRATIS (VISITATORI)</span>
                            )}
                            {event.paid_exhibitors ? (
                              <span className="text-[8px] font-bold bg-brick-red/10 text-brick-red border border-brick-red/20 px-2 py-1 uppercase tracking-widest">A PAGAMENTO (ESPOSITORI)</span>
                            ) : (
                              <span className="text-[8px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 uppercase tracking-widest">GRATIS (ESPOSITORI)</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4 mb-8">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-brick-red flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-white font-medium">{event.address}</p>
                              <a 
                                href={event.maps_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 mt-1 text-[9px] text-brick-red font-bold uppercase tracking-widest hover:underline"
                              >
                                <Navigation className="w-3 h-3" /> Vedi su Google Maps
                              </a>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4">
                            {event.instagram_post_link && (
                              <a href={event.instagram_post_link} target="_blank" rel="noopener noreferrer" className="text-[9px] text-gray-400 hover:text-white font-bold uppercase tracking-widest flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                                Post Locandina
                              </a>
                            )}
                          </div>

                          <p className="text-sm text-gray-500 italic leading-relaxed border-l-2 border-gray-800 pl-6 group-hover:border-brick-red/30 transition-colors">"{event.description}"</p>
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-900 flex flex-col gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Visitatori */}
                            <div className="flex flex-col gap-2">
                              {event.reg_link_visitors ? (
                                <a 
                                  href={event.reg_link_visitors} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full py-3 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-brick-red transition-all text-center"
                                >
                                  Registrazione Visitatori
                                </a>
                              ) : event.reg_at_entrance_visitors ? (
                                <div className="w-full py-3 bg-gray-900/50 border border-gray-800 text-gray-400 text-[9px] font-bold uppercase tracking-widest text-center">
                                  Registrazione all'ingresso (Visitatori)
                                </div>
                              ) : (
                                <div className="w-full py-3 bg-gray-900/30 text-gray-600 text-[9px] font-bold uppercase tracking-widest text-center">
                                  Nessuna registrazione (Visitatori)
                                </div>
                              )}
                            </div>

                            {/* Espositori */}
                            <div className="flex flex-col gap-2">
                              {event.reg_link_exhibitors ? (
                                <a 
                                  href={event.reg_link_exhibitors} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full py-3 bg-brick-red text-white text-[9px] font-bold uppercase tracking-widest hover:brightness-125 transition-all text-center"
                                >
                                  Registrazione Espositori
                                </a>
                              ) : event.reg_at_entrance_exhibitors ? (
                                <div className="w-full py-3 bg-brick-red/20 border border-brick-red/30 text-brick-red text-[9px] font-bold uppercase tracking-widest text-center">
                                  Registrazione all'ingresso (Espositori)
                                </div>
                              ) : (
                                <div className="w-full py-3 bg-gray-900/30 text-gray-600 text-[9px] font-bold uppercase tracking-widest text-center">
                                  Nessuna registrazione (Espositori)
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {(user.role === UserRole.ADMIN || event.created_by === user.id) && (
                            <button 
                              id={`delete-event-${event.id}`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm('Sei sicuro di voler eliminare questo evento?')) {
                                  try {
                                    await db.events.delete(event.id!);
                                    setEvents(prev => prev.filter(e => e.id !== event.id));
                                  } catch (err) {
                                    console.error("Delete error:", err);
                                    alert("Errore durante l'eliminazione dell'evento.");
                                  }
                                }
                              }}
                              className="mt-4 flex items-center gap-1.5 text-[9px] text-gray-500 hover:text-brick-red font-bold uppercase tracking-widest transition-all duration-300 self-end py-1 px-2 border border-transparent hover:border-brick-red/20 rounded group/del"
                            >
                              <Trash2 className="w-3.5 h-3.5 group-hover/del:scale-110 transition-transform" />
                              <span>Elimina Evento</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {currentView === View.ADMIN_PANEL && user.role === UserRole.ADMIN && (
          <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-12 border-b border-gray-900 pb-6">
              <h2 className="text-4xl font-brand text-white italic tracking-tighter">ADMIN<span className="text-brick-red">PANEL</span></h2>
              <button onClick={() => setCurrentView(View.HOME)} className="text-[10px] font-bold text-gray-600 hover:text-white uppercase tracking-widest border border-gray-800 px-4 py-2 transition-colors">Chiudi</button>
            </div>
            <div className="bg-panel-gray border border-gray-800 p-8">
              {/* Warning dinamico: appare solo se c'è un problema di sincronizzazione reale */}
              {showSyncWarning && (
                <div className="mb-8 bg-brick-red/10 border border-brick-red/30 p-6 rounded-lg animate-in slide-in-from-top-4">
                  <p className="text-[11px] text-brick-red font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="text-lg">⚠️</span> Stato Sincronizzazione Cloud
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest">
                    Attenzione: Le modifiche effettuate in questa sessione sono salvate solo LOCALMENTE. 
                    Il database Cloud non ha autorizzato l'operazione o è irraggiungibile. 
                    Verifica il tuo ruolo su Firebase per ripristinare la sincronizzazione.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.4em]">Gestione Utenti</h3>
                <span className="text-[9px] text-gray-700 uppercase tracking-widest">Totale: {allUsers.length}</span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {sortedUsers.length === 0 ? (
                  <p className="text-center py-12 text-gray-700 uppercase text-[10px] tracking-widest italic">Nessun utente trovato.</p>
                ) : (
                  sortedUsers.map((u, idx) => {
                    const isMaster = u.username?.toLowerCase() === 'tia_258';
                    return (
                      <div key={u.id || `user-${idx}`} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-black/40 border border-gray-900 hover:border-gray-700 transition-colors gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white tracking-tight">{u.username}</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-brick-red text-white' : (u.role === UserRole.ORGANIZER ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-gray-800 text-gray-500')}`}>
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-600 font-medium">{u.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {isMaster && (
                            <span className="text-[8px] text-brick-red/50 uppercase font-bold tracking-widest italic">[ Account Master ]</span>
                          )}
                          <div className="relative group/select">
                            <select 
                              disabled={isMaster}
                              value={u.role}
                            onChange={async (e) => {
                                const nextRole = e.target.value as UserRole;
                                const targetId = u.id;
                                const targetUsername = u.username;
                                
                                console.log(`Cambiando ruolo per ${targetUsername} (ID: ${targetId}) a ${nextRole}`);

                                if (!targetId) {
                                  alert("Errore: ID utente mancante. Prova a ricaricare la pagina.");
                                  return;
                                }

                                // Aggiornamento ottimistico: cerca per ID (primario) o Username (secondario)
                                setAllUsers(prev => prev.map(userItem => {
                                  const isTarget = userItem.id === targetId || (userItem.username === targetUsername && targetUsername);
                                  return isTarget ? { ...userItem, role: nextRole } : userItem;
                                }));

                                try {
                                  const success = await db.users.update(targetId, { role: nextRole });
                                  
                                  // Se l'aggiornamento locale è riuscito (success è true), non facciamo rollback
                                  if (success) {
                                    if (targetId === user.id) {
                                      setUser(prev => ({ ...prev, role: nextRole }));
                                      if (nextRole !== UserRole.ADMIN) {
                                        setTimeout(() => setCurrentView(View.HOME), 1000);
                                      }
                                    }
                                    // Non ricarichiamo subito tutto dal DB per evitare che un ritardo di sincro Cloud
                                    // sovrascriva la nostra modifica locale appena fatta.
                                    // La lista è già aggiornata ottimisticamente sopra.
                                  } else {
                                    throw new Error("Local update failed");
                                  }
                                } catch (err) {
                                  console.error("Errore salvataggio ruolo:", err);
                                  // Solo in caso di errore totale (nemmeno locale) ricarichiamo per pulizia
                                  const updatedUsers = await db.users.getAll();
                                  setAllUsers(updatedUsers);
                                  alert("Errore di comunicazione: la modifica non è stata salvata. Riprova.");
                                }
                              }}
                              className={`appearance-none bg-black border border-gray-800 text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2 pr-10 focus:border-brick-red outline-none transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${isMaster ? '' : 'text-gray-400 hover:text-white hover:border-gray-600'}`}
                            >
                              <option value={UserRole.USER} disabled={u.role === UserRole.USER}>
                                User {u.role === UserRole.USER ? ' (Attuale)' : ''}
                              </option>
                              <option value={UserRole.ORGANIZER} disabled={u.role === UserRole.ORGANIZER}>
                                Organizer {u.role === UserRole.ORGANIZER ? ' (Attuale)' : ''}
                              </option>
                              <option value={UserRole.ADMIN} disabled={u.role === UserRole.ADMIN}>
                                Admin {u.role === UserRole.ADMIN ? ' (Attuale)' : ''}
                              </option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600 group-hover/select:text-brick-red transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                          </div>
                          <button 
                            disabled={isMaster || u.id === user?.id}
                            onClick={async () => {
                              if (window.confirm(`Sei sicuro di voler eliminare l'utente ${u.username}?`)) {
                                await db.users.delete(u.id);
                                const updatedUsers = await db.users.getAll();
                                setAllUsers(updatedUsers);
                              }
                            }}
                            className={`text-[9px] font-bold uppercase tracking-[0.2em] text-gray-800 hover:text-brick-red transition-colors ${(isMaster || u.id === user?.id) ? 'opacity-0 pointer-events-none' : ''}`}
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} cloudStatus={cloudStatus} />}
      {isProfileModalOpen && (
        <ProfileModal 
          user={user} 
          onClose={() => setIsProfileModalOpen(false)} 
          onLogout={handleLogout}
          onUpdate={(u) => setUser(u)}
        />
      )}
      {selectedPublicUser && (
        <PublicProfileModal 
          user={selectedPublicUser}
          spots={spots}
          onClose={() => setSelectedPublicUser(null)}
          onSpotClick={(spot) => setSelectedSpot(spot)}
        />
      )}
      
      {selectedSpot && (
        <SpotDetailModal 
          spot={selectedSpot} 
          onClose={() => setSelectedSpot(null)} 
        />
      )}

      {isAddSpotModalOpen && (
        <AddSpotModal 
          user={user}
          onClose={() => setIsAddSpotModalOpen(false)}
          onSpotAdded={async () => {
            const updatedSpots = await db.spots.getAll();
            setSpots(updatedSpots);
            setIsAddSpotModalOpen(false);
          }}
        />
      )}
      
      <footer className="py-16 bg-black border-t border-gray-900 text-center">
        <p className="text-[10px] text-gray-700 uppercase tracking-[0.8em] mb-4">RADUNINORDITALIA •driven by passion</p>
        <div className="flex justify-center gap-8 mb-8">
           <span className="text-gray-800 text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-brick-red transition-colors">Instagram</span>
           <span className="text-gray-800 text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-brick-red transition-colors">TikTok</span>
           <span className="text-gray-800 text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-brick-red transition-colors">Discord</span>
        </div>
        <p className="text-[8px] text-gray-900 uppercase tracking-widest">&copy; {new Date().getFullYear()} All Rights Reserved</p>
      </footer>
    </div>
  );
};

const InputField = ({ label, type = 'text', ...props }: any) => {
  return (
    <div>
      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">{label}</label>
      <input 
        {...props}
        type={type}
        className="w-full bg-black border border-gray-800 p-2 text-white focus:border-brick-red outline-none transition-colors text-xs placeholder:text-gray-800"
      />
    </div>
  );
};

export default App;
