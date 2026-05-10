import React, { useState, useRef, useEffect } from 'react';
import { db } from '../services/db';
import { identifyCarFromImage } from '../services/geminiService';
import { compressImage } from '../lib/imageUtils';
import { User } from '../types';

interface AddSpotModalProps {
  user: User;
  onClose: () => void;
  onSpotAdded: () => void;
}

const AddSpotModal: React.FC<AddSpotModalProps> = ({ user, onClose, onSpotAdded }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scannedCarModel, setScannedCarModel] = useState('');
  const [location, setLocation] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64ForAI, setBase64ForAI] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setScannedCarModel('');
    setIsAnalyzing(true);
    
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fullBase64 = event.target?.result as string;

      try {
        // Comprimiamo l'immagine per l'IA e per il database
        const compressedBase64 = await compressImage(fullBase64, 1024, 1024, 0.7, 800);
        setBase64ForAI(compressedBase64);

        const mimeType = 'image/jpeg'; // compressImage restituisce sempre jpeg
        const base64Data = compressedBase64.split(',')[1];
        const carModel = await identifyCarFromImage(base64Data, mimeType);
        if (carModel && carModel !== 'Sconosciuta') {
          setScannedCarModel(carModel);
        }
      } catch (err: any) {
        setError("Errore durante l'elaborazione dell'immagine: " + (err.message || "Errore sconosciuto"));
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("La geolocalizzazione non è supportata dal tuo browser.");
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Usiamo reverse geocoding semplice o mostriamo coordinate
          // Per ora usiamo un placeholder o proviamo a chiamare un'api se disponibile
          // In alternativa, mostriamo semplicemente le coordinate o chiediamo all'utente
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          
          // Se volessimo proprio il nome della città potremmo usare un servizio esterno
          // ma per ora le coordinate sono un ottimo inizio "tecnico"
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (err) => {
        setIsLoadingLocation(false);
        setError("Impossibile recuperare la posizione. Assicurati di aver dato i permessi GPS.");
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!base64ForAI || isSaving) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const carModelInput = (formData.get('car_model') as string) || scannedCarModel || "Auto Sconosciuta";
    const locationInput = (formData.get('location') as string) || location || "Nord Italia";

    const newSpot = {
      car_model: carModelInput,
      location: locationInput,
      spotted_by: user.username || 'Anonimo',
      image_data: base64ForAI,
      created_at: new Date().toISOString()
    };
    
    try {
      const savedSpot = await db.spots.create(newSpot);
      if (savedSpot) {
        onSpotAdded();
        onClose();
      }
    } catch (err) {
      setError("Errore durante il salvataggio dello spot.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-panel-gray border border-gray-800 w-full max-w-2xl relative shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
        {/* Header */}
        <div className="border-b border-gray-800 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-brand text-white italic tracking-tighter">AGGIUNGI <span className="text-brick-red">SPOT</span></h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Carica la foto e l'IA farà il resto</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-4 md:p-8">
          {error && (
            <div className="mb-6 p-3 bg-brick-red/10 border border-brick-red/30 text-brick-red text-[9px] font-bold uppercase tracking-widest text-center animate-pulse">
              {error}
            </div>
          )}

          <div className="mb-8">
            <div className="relative w-full aspect-video bg-black border border-gray-800 flex items-center justify-center overflow-hidden group">
              {previewUrl ? (
                <>
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className={`w-full h-full object-contain transition-opacity duration-300 ${isAnalyzing ? 'opacity-30' : 'opacity-100'}`}
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
                       <div className="w-12 h-12 border-4 border-brick-red/20 border-t-brick-red rounded-full animate-spin mb-4"></div>
                       <p className="text-[10px] font-bold text-white uppercase tracking-[0.4em]">Analisi IA...</p>
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => { setPreviewUrl(null); setBase64ForAI(null); setScannedCarModel(''); }}
                    className="absolute top-4 right-4 bg-brick-red text-white p-2 hover:scale-110 transition-transform z-20 shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </>
              ) : (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-4 group px-12 py-16 w-full h-full"
                >
                  <div className="w-16 h-16 rounded-full border border-gray-800 flex items-center justify-center group-hover:border-brick-red group-hover:bg-brick-red/5 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b03a2e" strokeWidth="1.5"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  </div>
                  <div className="text-center">
                    <span className="block text-[11px] font-bold uppercase tracking-[0.5em] text-gray-500 group-hover:text-white transition-colors mb-1">Carica Foto Auto</span>
                    <span className="block text-[8px] text-gray-700 uppercase tracking-widest font-bold">Supporta JPG, PNG, WEBP</span>
                  </div>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">Modello Identificato</label>
              <input 
                name="car_model" 
                placeholder="Es: Porsche 911 GT3..." 
                value={scannedCarModel}
                onChange={(e) => setScannedCarModel(e.target.value)}
                className="w-full bg-black border border-gray-800 p-4 text-sm outline-none focus:border-brick-red text-white transition-colors" 
                required 
              />
              {scannedCarModel && !isAnalyzing && (
                <span className="absolute -top-3 right-3 bg-panel-gray px-2 text-[7px] font-bold text-brick-red uppercase tracking-[0.2em] border border-gray-800">Gemini IA Confidence</span>
              )}
            </div>

            <div className="relative">
              <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">Posizione Avvistamento</label>
              <div className="flex gap-2">
                <input 
                  name="location" 
                  placeholder="Es: Padova, Via Roma..." 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 bg-black border border-gray-800 p-4 text-sm outline-none focus:border-brick-red text-white transition-colors" 
                  required 
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLoadingLocation}
                  className="bg-gray-900 border border-gray-800 px-4 flex items-center justify-center hover:bg-gray-800 transition-colors"
                  title="Ottieni posizione attuale"
                >
                  {isLoadingLocation ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!previewUrl || isAnalyzing || isSaving}
              className={`w-full bg-brick-red text-white font-bold text-xs uppercase tracking-[0.4em] py-5 hover:brightness-110 transition-all flex items-center justify-center gap-3 ${(!previewUrl || isAnalyzing || isSaving) ? 'opacity-20 cursor-not-allowed' : 'shadow-xl shadow-brick-red/20'}`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Salvataggio...
                </>
              ) : (
                <>PUBBLICA AVVISTAMENTO</>
              )}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="w-full bg-transparent text-gray-600 font-bold text-[10px] uppercase tracking-widest py-3 hover:text-white transition-colors"
            >
              Annulla e Torna Indietro
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSpotModal;
