import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultViewer } from './components/ResultViewer';
import { fileToBase64, getMimeType } from './utils/imageUtils';
import { removeImageBackground } from './services/geminiService';
import { AppStatus } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [aiRawImage, setAiRawImage] = useState<string | null>(null); // This is the Green Screen image from Gemini
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = async (file: File) => {
    try {
      setStatus(AppStatus.PROCESSING);
      setError(null);
      
      // Convert for preview
      const base64Preview = await fileToBase64(file);
      const mimeType = getMimeType(file);
      setOriginalImage(`data:${mimeType};base64,${base64Preview}`);

      // Call API to replace background with Green Screen (#00FF00)
      const aiResultBase64 = await removeImageBackground(base64Preview, mimeType);
      
      // We do NOT process it here anymore. We pass the raw "Green Screen" image 
      // to the viewer so the user can tune the removal parameters interactively.
      setAiRawImage(aiResultBase64);
      
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setError("Si è verificato un errore durante l'elaborazione dell'immagine. Riprova con un'immagine diversa o più piccola.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setOriginalImage(null);
    setAiRawImage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <Header />

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
              Carica la tua immagine e lascia che l'intelligenza artificiale isoli il soggetto per te. Veloce, preciso e gratuito.
            </p>
          </div>
        )}

        {/* Upload State */}
        {status === AppStatus.IDLE && (
          <ImageUploader onImageSelected={handleImageSelected} />
        )}

        {/* Processing State */}
        {status === AppStatus.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
            </div>
            <h3 className="mt-8 text-xl font-medium text-white">Analisi immagine in corso...</h3>
            <p className="text-slate-400 mt-2">L'IA sta separando il soggetto dallo sfondo.</p>
          </div>
        )}

        {/* Error State */}
        {status === AppStatus.ERROR && (
          <div className="w-full max-w-md bg-red-500/10 border border-red-500/50 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-lg font-bold text-red-200">Qualcosa è andato storto</h3>
            <p className="text-red-300/80 text-sm">{error}</p>
            <button 
              onClick={handleReset}
              className="mt-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-colors"
            >
              Riprova
            </button>
          </div>
        )}

        {/* Success State */}
        {status === AppStatus.SUCCESS && originalImage && aiRawImage && (
          <ResultViewer 
            originalImage={originalImage} 
            rawAiImage={aiRawImage} 
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