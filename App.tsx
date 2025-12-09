import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultViewer } from './components/ResultViewer';
import { fileToBase64, getMimeType, invertImage, resizeImage } from './utils/imageUtils';
import { removeImageBackground } from './services/geminiService';
import { AppStatus, RemovalPreset } from './types';
import { Loader2, AlertCircle, Contrast } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [aiRawImage, setAiRawImage] = useState<string | null>(null); 
  const [error, setError] = useState<string | null>(null);
  const [invertMode, setInvertMode] = useState(false);
  const [preset, setPreset] = useState<RemovalPreset>('green');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  // Check API Key on Mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        }
      } catch (e) {
        console.error("Key check failed", e);
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        // Assume success and update state to trigger re-render with "Pro" status
        setHasApiKey(true);
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleImageSelected = async (file: File) => {
    try {
      setStatus(AppStatus.PROCESSING);
      setError(null);
      
      // 1. Convert to Base64
      let base64Preview = await fileToBase64(file);
      const mimeType = getMimeType(file);
      
      // 2. Resize if too big 
      // Use 1536px for Pro to maximize detail.
      // Use 800px for Free (Flash) to be extremely safe against payload limits and optimize speed.
      const maxDimension = hasApiKey ? 1536 : 800;
      base64Preview = await resizeImage(base64Preview, maxDimension);

      // Store original for display
      setOriginalImage(`data:${mimeType};base64,${base64Preview}`);

      // PROCESSING PIPELINE
      let inputForGemini = base64Preview;
      let currentPreset: RemovalPreset = 'green';

      if (invertMode) {
        // 3a. Invert Input (Black BG -> White BG)
        inputForGemini = await invertImage(base64Preview);
        currentPreset = 'magenta'; // Inverted Green is Magenta
      }

      // 4. Call API 
      // Pass 'hasApiKey' as 'useProModel'. If true -> Gemini 3 Pro. If false -> Gemini 2.5 Flash Image.
      const aiResultBase64 = await removeImageBackground(inputForGemini, mimeType, hasApiKey);
      
      let finalRawImage = aiResultBase64;

      if (invertMode) {
        // 3b. Invert Output (Inverted Subject on Green -> Normal Subject on Magenta)
        finalRawImage = await invertImage(aiResultBase64);
      }
      
      setPreset(currentPreset);
      setAiRawImage(finalRawImage);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Si è verificato un errore durante l'elaborazione.";
      
      const errString = err.toString();
      
      if (errString.includes("SAFETY_BLOCK")) {
        errorMessage = "L'immagine è stata bloccata dai filtri di sicurezza del modello gratuito (spesso accade con le persone). Per elaborare questa foto, collega la tua Chiave API e usa la modalità Pro.";
      } else if (err.message && err.message.includes("No content")) {
         if (!hasApiKey) {
          errorMessage = "Il modello gratuito non è riuscito a generare una risposta. L'immagine potrebbe essere troppo complessa o i server troppo occupati.";
        } else {
          errorMessage = "L'IA non ha restituito risultati. Riprova con un'altra immagine.";
        }
      }
      
      setError(errorMessage);
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setOriginalImage(null);
    setAiRawImage(null);
    setError(null);
  };

  if (checkingKey) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Header hasApiKey={hasApiKey} onConnectApiKey={handleSelectKey} />

      <main className="flex-grow flex flex-col items-center justify-start p-6 md:p-12 gap-8">
        
        {/* Hero Section */}
        {status === AppStatus.IDLE && (
          <div className="text-center max-w-2xl mx-auto space-y-4 animate-fade-in-down">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Rimuovi lo sfondo <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                in pochi secondi
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              Carica la tua immagine e lascia che l'intelligenza artificiale isoli il soggetto per te.
              <br/>
              <span className="text-sm opacity-70">Usa il modello gratuito o collega la tua chiave per la massima qualità.</span>
            </p>
          </div>
        )}

        {/* Upload State */}
        {status === AppStatus.IDLE && (
          <div className="w-full max-w-2xl mx-auto space-y-4">
            
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-end px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={invertMode} 
                    onChange={(e) => setInvertMode(e.target.checked)}
                  />
                  <div className={`w-10 h-6 rounded-full shadow-inner transition-colors ${invertMode ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${invertMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400 group-hover:text-slate-200 transition-colors select-none">
                  <Contrast className="w-4 h-4" />
                  <span>Ottimizza per sfondi scuri (Inversione)</span>
                </div>
              </label>
            </div>

            <ImageUploader onImageSelected={handleImageSelected} />
            
            <p className="text-center text-xs text-slate-500">
              {invertMode 
                ? "ℹ️ Modalità attiva: L'immagine verrà invertita per aiutare l'IA a distinguere il soggetto dallo sfondo nero." 
                : "ℹ️ Modalità Standard: Ideale per la maggior parte delle foto."}
            </p>
          </div>
        )}

        {/* Processing State */}
        {status === AppStatus.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
            </div>
            <h3 className="mt-8 text-xl font-medium text-white">
              {invertMode ? 'Inversione e Analisi...' : 'Analisi immagine in corso...'}
            </h3>
            <p className="text-slate-400 mt-2">
               {hasApiKey 
                 ? "Utilizzo Gemini Pro Vision (Alta Qualità)..." 
                 : "Utilizzo Gemini Flash Image (Veloce)..."
               }
            </p>
          </div>
        )}

        {/* Error State */}
        {status === AppStatus.ERROR && (
          <div className="w-full max-w-md bg-red-500/10 border border-red-500/50 rounded-2xl p-6 flex flex-col items-center text-center gap-4 animate-fade-in-up">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-lg font-bold text-red-200">Qualcosa è andato storto</h3>
            <p className="text-red-300/80 text-sm">{error}</p>
            <div className="flex gap-2 w-full justify-center mt-2">
              <button 
                onClick={handleReset}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full text-sm font-medium transition-colors"
              >
                Riprova
              </button>
              {!hasApiKey && (
                <button 
                  onClick={handleSelectKey}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-sm font-medium transition-colors"
                >
                  Passa a Pro
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {status === AppStatus.SUCCESS && originalImage && aiRawImage && (
          <ResultViewer 
            originalImage={originalImage} 
            rawAiImage={aiRawImage} 
            preset={preset}
            onReset={handleReset} 
          />
        )}
      </main>

      <footer className="py-6 text-center text-slate-600 text-sm border-t border-slate-800/50">
        <p>&copy; {new Date().getFullYear()} SfondoVia AI. Creato con Google Gemini API.</p>
      </footer>
    </div>
  );
};

export default App;