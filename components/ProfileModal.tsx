
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, UserRole } from '../types';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  onUpdate: (newData: any) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onLogout, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'options' | 'manage'>('options');
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    email: user.email || '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  // Sincronizziamo i dati se cambia l'utente o se vengono caricati dal DB
  useEffect(() => {
    if (user.id) {
      loadFullData();
    }
  }, [user.id]);

  const loadFullData = async () => {
    if (!user.id) return;
    try {
      const data = await db.users.getById(user.id);
      if (data) {
        setEditForm(prev => ({ 
          ...prev, 
          email: data.email || ''
        }));
      }
    } catch (err) {
      console.error("Errore caricamento dati profilo", err);
    }
  };

  const handleBecomeOrganizer = () => {
    if (user.role === UserRole.ADMIN) {
      alert("Sei già un amministratore!");
      return;
    }
    if (user.role === UserRole.ORGANIZER) {
      alert("Sei già un organizzatore!");
      return;
    }
    
    // Apriamo il modulo Google fornito dall'utente per la richiesta
    window.open("https://forms.gle/cbwnGEbRoTx58Whn8", "_blank");
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm("ATTENZIONE: Stai per eliminare il tuo account definitivamente. Tutti i tuoi dati andranno persi. Continuare?");
    if (!confirm1) return;
    
    const confirm2 = window.prompt("Scrivi 'ELIMINA' per confermare l'operazione definitiva:");
    if (confirm2 !== 'ELIMINA') return;

    setIsLoading(true);
    try {
      await db.users.delete(user.id!);
      onLogout();
      onClose();
    } catch (err) {
      alert("Errore durante l'eliminazione.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setMessage({ text: "Le password non coincidono.", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const updates: any = { 
        email: editForm.email
      };
      if (editForm.password) updates.password = editForm.password;

      await db.users.update(user.id!, updates);
      onUpdate({ 
        ...user, 
        email: editForm.email
      });
      setMessage({ text: "Profilo aggiornato con successo!", type: "success" });
      setTimeout(() => {
        setMessage({ text: '', type: '' });
        setActiveTab('options');
      }, 1500);
    } catch (err) {
      setMessage({ text: "Errore durante l'aggiornamento.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-xl">
      <div className="min-h-full flex items-start md:items-center justify-center p-4">
        <div className="absolute inset-0" onClick={onClose}></div>

        <div className="relative w-full max-w-lg my-auto animate-in fade-in zoom-in duration-300">
        <div className="bg-panel-gray border border-gray-800 p-6 md:p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-10 border-b border-gray-900 pb-4">
            <h2 className="text-2xl font-brand text-white italic tracking-tighter">
              ACCOUNT<span className="text-brick-red">PANEL</span>
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {message.text && (
            <div className={`mb-6 p-3 text-[10px] font-bold uppercase tracking-widest text-center border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-brick-red/10 border-brick-red/30 text-brick-red'}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'options' && (
            <div className="grid grid-cols-1 gap-4">
              {user.role === UserRole.USER ? (
                <ProfileOption 
                  title="Account Organizzatore" 
                  desc="Invia la richiesta per gestire i tuoi eventi" 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                  href="https://forms.gle/cbwnGEbRoTx58Whn8"
                  color="blue"
                />
              ) : (
                <div className="flex items-center gap-6 p-4 bg-brick-red/5 border border-brick-red/20 opacity-80">
                  <div className="p-3 rounded-sm text-brick-red bg-brick-red/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brick-red">Profilo Verificato</h3>
                    <p className="text-[9px] text-gray-600 uppercase tracking-tight mt-0.5">Sei già un {user.role === UserRole.ADMIN ? 'Amministratore' : 'Organizzatore'}</p>
                  </div>
                </div>
              )}
              <ProfileOption 
                title="Gestione Profilo" 
                desc="Controlla e modifica i tuoi dati e la password" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>}
                onClick={() => setActiveTab('manage')}
                color="white"
              />
              <ProfileOption 
                title="Elimina Account" 
                desc="Rimuovi definitivamente il tuo profilo da RNI" 
                icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>}
                onClick={handleDeleteAccount}
                color="red"
              />
            </div>
          )}

          {activeTab === 'manage' && (
            <form onSubmit={handleUpdateData} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-4 border-b border-gray-900 pb-6">
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-gray-600 tracking-widest uppercase">Username</p>
                   <p className="text-sm font-bold text-white tracking-wider">{user.username}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-gray-600 tracking-widest uppercase">Ruolo Attuale</p>
                   <p className={`text-sm font-bold tracking-wider uppercase ${user.role === UserRole.ADMIN ? 'text-brick-red' : user.role === UserRole.ORGANIZER ? 'text-blue-500' : 'text-white'}`}>{user.role}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>Email di registrazione</span>
                    {user.email && <span className="text-[8px] text-brick-red/50">Inserita alla registrazione</span>}
                  </label>
                  <input 
                    type="email" 
                    value={editForm.email} 
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className="w-full bg-black border border-gray-800 p-3 text-white focus:border-brick-red outline-none transition-colors text-sm"
                    required
                    placeholder="La tua email..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nuova Password</label>
                    <input 
                      type="password" 
                      placeholder="Lascia vuoto"
                      value={editForm.password} 
                      onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                      className="w-full bg-black border border-gray-800 p-3 text-white focus:border-brick-red outline-none transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Conferma Password</label>
                    <input 
                      type="password" 
                      value={editForm.confirmPassword} 
                      onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                      className="w-full bg-black border border-gray-800 p-3 text-white focus:border-brick-red outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setActiveTab('options')} 
                  className="flex-1 py-4 border border-gray-800 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                >
                  Indietro
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="flex-1 py-4 bg-brick-red text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brick-red/20"
                >
                  {isLoading ? 'Aggiornamento...' : 'Aggiorna Profilo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

const ProfileOption = ({ title, desc, icon, onClick, color, href }: any) => {
  const content = (
    <>
      <div className={`p-3 rounded-sm ${
        color === 'red' ? 'text-brick-red bg-brick-red/5' : 
        color === 'blue' ? 'text-blue-500 bg-blue-500/5' : 
        'text-gray-500 bg-gray-500/5'
      } transition-colors group-hover:bg-white/10 group-hover:text-white`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${color === 'red' ? 'text-brick-red/80' : color === 'blue' ? 'text-blue-400' : 'text-gray-300'} group-hover:text-white transition-colors`}>{title}</h3>
        <p className="text-[9px] text-gray-600 uppercase tracking-tight mt-0.5">{desc}</p>
      </div>
      <div className="text-gray-800 group-hover:text-brick-red transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    </>
  );

  const className = "flex items-center gap-6 p-4 bg-black/40 border border-gray-900 hover:border-gray-700 transition-all text-left group w-full";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export default ProfileModal;
