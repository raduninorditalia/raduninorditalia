
import React from 'react';
import { User, UserRole } from '../types';
import { Instagram } from 'lucide-react';

interface HeaderProps {
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  user: User;
  onNavigateHome: () => void;
  onOpenAdmin: () => void;
  onRetryConnection: () => void;
  cloudStatus: 'connected' | 'local' | 'error';
}

const Header: React.FC<HeaderProps> = ({ 
  onOpenAuth, 
  onLogout, 
  onOpenProfile, 
  user, 
  onNavigateHome, 
  onOpenAdmin, 
  onRetryConnection,
  cloudStatus
}) => {
  const isCloud = cloudStatus === 'connected';
  const isError = cloudStatus === 'error';

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-gray-800 z-50">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-3 md:px-8">
        <div className="flex items-center shrink-0">
          <div 
            onClick={onNavigateHome}
            className="flex items-center group cursor-pointer mr-2 md:mr-6"
          >
            <div className="relative w-8 h-8 md:w-10 md:h-10 bg-panel-gray rounded-full overflow-hidden flex items-center justify-center shadow-lg border border-gray-800 group-hover:scale-105 group-hover:border-brick-red transition-all duration-300">
               <img 
                 src="/logo.png" 
                 alt="RNI" 
                 className="w-full h-full object-cover"
                 onError={(e) => {
                   const target = e.target as HTMLImageElement;
                   target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23b03a2e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2'/%3E%3Ccircle cx='7' cy='17' r='2'/%3E%3Cpath d='M9 17h6'/%3E%3Ccircle cx='17' cy='17' r='2'/%3E%3C/svg%3E";
                 }}
               />
            </div>
            <div className="flex flex-col ml-3">
              <h1 
                className="text-brick-red font-brand text-xl md:text-2xl hover:opacity-80 transition-opacity tracking-wider leading-none"
              >
                <span className="hidden sm:inline">RADUNI NORDITALIA</span>
                <span className="sm:hidden font-black">RNI</span>
              </h1>
              <div className="flex items-center mt-0.5">
                <span 
                  title={isCloud ? 'Database Cloud Connesso' : isError ? 'Errore Connessione' : 'Modalità Locale'}
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isCloud ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : isError ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-ping' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]'}`}
                ></span>
                <span className={`text-[6px] md:text-[7px] font-black uppercase tracking-widest ${isCloud ? 'text-green-500/80' : isError ? 'text-red-500/80' : 'text-orange-500/80'}`}>
                  {isCloud ? 'Cloud connected' : isError ? 'Connection Error' : 'Local database'}
                </span>
                {!isCloud && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRetryConnection(); }}
                    className="ml-2 text-[6px] font-bold text-white uppercase tracking-tighter hover:text-brick-red transition-colors border border-gray-800 px-1 rounded-sm"
                  >
                    Riconnetti
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <a 
            href="https://www.instagram.com/raduninorditalia/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center w-8 h-8 transition-all duration-300"
            title="Instagram"
          >
            <Instagram 
              strokeWidth={1.5} 
              className="w-5 h-5 text-brick-red transition-all duration-300 group-hover:drop-shadow-[0_0_8px_#b03a2e] group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-brick-red/0 group-hover:bg-brick-red/10 rounded-full blur-md transition-all duration-300" />
          </a>
          <a 
            href="https://www.tiktok.com/@raduninorditalia?lang=it-IT" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center w-8 h-8 transition-all duration-300"
            title="TikTok"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5 text-brick-red transition-all duration-300 group-hover:drop-shadow-[0_0_8px_#b03a2e] group-hover:scale-110"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
            </svg>
            <div className="absolute inset-0 bg-brick-red/0 group-hover:bg-brick-red/10 rounded-full blur-md transition-all duration-300" />
          </a>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {user.isLoggedIn ? (
            <div className="flex items-center gap-2 md:gap-4">
              {user.role === UserRole.ADMIN && (
                <button 
                  onClick={onOpenAdmin}
                  className="flex items-center gap-2 px-2 md:px-3 py-1.5 border border-brick-red/30 bg-brick-red/5 text-brick-red text-[9px] font-bold uppercase tracking-widest hover:bg-brick-red hover:text-white transition-all shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              )}
              
              <button 
                onClick={onOpenProfile}
                className="flex flex-col items-end group hover:bg-white/5 px-1 md:px-2 py-1 transition-colors rounded-sm shrink-0"
              >
                <span className="text-white text-[10px] md:text-xs font-bold uppercase tracking-tighter leading-none group-hover:text-brick-red transition-colors">
                  {user.username}
                </span>
                <span className={`text-[7px] md:text-[8px] font-bold uppercase tracking-widest ${user.role === UserRole.ADMIN ? 'text-brick-red' : user.role === UserRole.ORGANIZER ? 'text-blue-500' : 'text-gray-500'}`}>
                  {user.role}
                </span>
              </button>

              <button 
                onClick={onLogout}
                className="px-2 md:px-4 py-1.5 border border-gray-700 hover:border-brick-red hover:text-brick-red text-gray-400 text-[9px] md:text-xs font-bold uppercase transition-all tracking-widest shrink-0"
              >
                Esci
              </button>
            </div>
          ) : (
            <button 
              onClick={onOpenAuth}
              className="px-4 md:px-6 py-1.5 bg-brick-red hover:bg-brick-red/90 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
            >
              Accedi
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;
