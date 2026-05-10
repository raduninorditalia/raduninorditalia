
import React, { useState } from 'react';
import { db } from '../services/db';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (userData: any) => void;
  cloudStatus: 'connected' | 'local' | 'error';
}

type AuthMode = 'login' | 'register' | 'organizer';

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, cloudStatus }) => {
  const isCloud = cloudStatus === 'connected';
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (mode === 'login') {
        try {
          const session = await db.auth.login({
            identifier: formData.identifier,
            password: formData.password
          });
          onLogin(session);
        } catch (err: any) {
          setError(err.message || 'Credenziali non valide. Riprova.');
        }
      } else if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setError('Le password non coincidono.');
          setIsLoading(false);
          return;
        }
        
        if (formData.username && formData.email && formData.password) {
          try {
            const newUser = await db.auth.register({
              username: formData.username,
              email: formData.email,
              password: formData.password
            });
            
            if (newUser) {
              onLogin(newUser);
            } else {
              setError('Errore durante la creazione. Verifica connessione database.');
            }
          } catch (err: any) {
            setError(err.message || 'Errore durante la registrazione.');
          }
        } else {
          setError('Compila tutti i campi obbligatori.');
        }
      }
    } catch (err: any) {
      console.error("Submit Error:", err);
      setError(err.message || "Errore di connessione.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-md">
      <div className="min-h-full flex items-start md:items-center justify-center p-4">
        <div className="absolute inset-0" onClick={onClose}></div>

        <button 
          onClick={onClose}
          className="fixed top-8 left-8 flex items-center gap-3 text-gray-500 hover:text-brick-red transition-all group z-[110] outline-none"
        >
          <div className="transition-transform group-hover:-translate-x-1 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.4em] opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
            Annulla
          </span>
        </button>

        <div className="relative w-full max-w-md my-auto animate-in zoom-in duration-300">
        <div className="bg-panel-gray border border-gray-800 p-8 shadow-2xl relative">
          {/* Badge Database Mode */}
          <div className="absolute top-0 right-0 px-3 py-1 bg-black border-l border-b border-gray-800 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]'}`}></div>
            <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest">{isCloud ? 'Cloud' : 'Local'} DB</span>
          </div>

          <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 mt-2">
            <button 
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`text-xl font-brand transition-colors ${mode === 'login' ? 'text-brick-red' : 'text-gray-600 hover:text-gray-400'}`}
              disabled={isLoading}
            >
              ACCEDI
            </button>
            <button 
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`text-xl font-brand transition-colors ${mode === 'register' ? 'text-brick-red' : 'text-gray-600 hover:text-gray-400'}`}
              disabled={isLoading}
            >
              REGISTRATI
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-brick-red/10 border border-brick-red/30 p-4 text-brick-red text-[11px] font-bold text-center uppercase tracking-[0.1em] leading-relaxed">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 p-3 text-green-500 text-[10px] font-bold text-center uppercase tracking-[0.2em]">
                {success}
              </div>
            )}

            {mode === 'login' ? (
              <>
                <InputField label="Username o Email" name="identifier" value={formData.identifier} onChange={handleInputChange} placeholder="Esempio: TIA_258" disabled={isLoading} />
                <InputField label="Password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" disabled={isLoading} />
              </>
            ) : (
              <>
                <InputField label="Username scelto" name="username" value={formData.username} onChange={handleInputChange} placeholder="Esempio: TIA_258" disabled={isLoading} />
                <InputField label="Email valida" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="nome@esempio.it" disabled={isLoading} />
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="••••" disabled={isLoading} />
                  <InputField label="Conferma password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••" disabled={isLoading} />
                </div>
              </>
            )}
            
            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full bg-brick-red text-white py-4 font-bold hover:bg-brick-red/90 transition-all active:scale-[0.98] mt-4 tracking-[0.2em] text-sm flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {mode === 'login' ? 'ACCEDI ORA' : 'CREA PROFILO'}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
);
};

const InputField = ({ label, type = 'text', ...props }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1.5">{label}</label>
      <div className="relative">
        <input 
          {...props}
          type={inputType}
          className="w-full bg-black border border-gray-800 p-3 pr-10 text-white focus:border-brick-red outline-none transition-colors text-sm placeholder:text-gray-700 disabled:opacity-50"
          required
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-brick-red transition-colors outline-none"
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
