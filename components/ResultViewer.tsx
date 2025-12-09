import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Layers, Grid, Pipette, Sliders } from 'lucide-react';
import { downloadImage, removeBackgroundDynamic } from '../utils/imageUtils';
import { RGB, RemovalPreset } from '../types';

interface ResultViewerProps {
  originalImage: string;
  rawAiImage: string; // The green (or magenta) screen result
  preset: RemovalPreset;
  onReset: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ originalImage, rawAiImage, preset, onReset }) => {
  const [viewMode, setViewMode] = useState<'split' | 'single'>('split');
  const [bgClass, setBgClass] = useState('bg-checkerboard');
  
  // Interactive State
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(15);
  const [smoothing, setSmoothing] = useState<number>(25);
  const [keyColor, setKeyColor] = useState<RGB | undefined>(undefined);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // When props change or sliders change, re-process
  useEffect(() => {
    let mounted = true;
    
    const process = async () => {
      if (!rawAiImage) return;
      setIsProcessing(true);
      try {
        const result = await removeBackgroundDynamic(rawAiImage, threshold, smoothing, keyColor, preset);
        if (mounted) {
          setProcessedImage(result);
        }
      } catch (e) {
        console.error("Processing error", e);
      } finally {
        if (mounted) setIsProcessing(false);
      }
    };

    const timer = setTimeout(process, 50);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [rawAiImage, threshold, smoothing, keyColor, preset]);

  const handleDownload = () => {
    if (processedImage) {
      downloadImage(processedImage, `sfondovia-result-${Date.now()}.png`);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPickingColor) return;

    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const naturalX = (x / rect.width) * img.naturalWidth;
    const naturalY = (y / rect.height) * img.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const p = ctx.getImageData(naturalX, naturalY, 1, 1).data;
      setKeyColor({ r: p[0], g: p[1], b: p[2] });
      setThreshold(30); 
      setIsPickingColor(false);
    }
  };

  const rawDataUrl = `data:image/png;base64,${rawAiImage}`;
  const processedDataUrl = processedImage ? `data:image/png;base64,${processedImage}` : rawDataUrl;

  const autoLabel = preset === 'green' ? 'Auto (Verde)' : 'Auto (Magenta)';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Editor Risultato</h2>
          <p className="text-slate-400 text-sm">Regola i parametri per perfezionare i bordi</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
           <button
            onClick={() => setViewMode(viewMode === 'split' ? 'single' : 'split')}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors text-sm font-medium border border-slate-700"
          >
            <Layers className="w-4 h-4" />
            {viewMode === 'split' ? 'Vista Singola' : 'Confronto'}
          </button>
          <button
            onClick={onReset}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors text-sm font-medium border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            Nuova
          </button>
          <button
            onClick={handleDownload}
            disabled={!processedImage}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Scarica
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Editor Controls Sidebar */}
        <div className="lg:col-span-1 space-y-6 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-fit">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold border-b border-slate-700 pb-2 mb-4">
            <Sliders className="w-5 h-5" />
            <span>Parametri Rimozione</span>
          </div>

          {/* Color Picker Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Colore da Rimuovere</label>
            <button
              onClick={() => {
                setIsPickingColor(!isPickingColor);
                if (!isPickingColor) setKeyColor(undefined); 
              }}
              className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                isPickingColor 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                  : keyColor 
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              <Pipette className="w-5 h-5" />
              {isPickingColor ? 'Clicca sull\'immagine...' : keyColor ? 'Colore Manuale Attivo' : autoLabel}
            </button>
            {keyColor && (
              <div className="flex items-center gap-2 mt-2">
                 <div 
                   className="w-6 h-6 rounded-full border border-white/20 shadow-inner" 
                   style={{ backgroundColor: `rgb(${keyColor.r},${keyColor.g},${keyColor.b})`}}
                 />
                 <button onClick={() => setKeyColor(undefined)} className="text-xs text-red-400 underline hover:text-red-300">Resetta ad Auto</button>
              </div>
            )}
            <p className="text-xs text-slate-500">
              {isPickingColor ? "Clicca sull'immagine di destra per selezionare il colore esatto dello sfondo." : `Modalità Auto attiva: rimuove il ${preset === 'green' ? 'Verde' : 'Magenta'}.`}
            </p>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-slate-300">Tolleranza</label>
                <span className="text-indigo-400 font-mono">{threshold}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={threshold} 
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <label className="text-slate-300">Morbidezza Bordi</label>
                <span className="text-indigo-400 font-mono">{smoothing}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="50" 
                value={smoothing} 
                onChange={(e) => setSmoothing(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Background Preview Tools */}
          <div className="pt-4 border-t border-slate-700 space-y-2">
            <span className="text-sm text-slate-400">Sfondo Anteprima</span>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button 
                onClick={() => setBgClass('bg-checkerboard')} 
                className={`flex-1 p-1.5 rounded-md transition-all flex justify-center ${bgClass === 'bg-checkerboard' ? 'bg-indigo-600 text-white' : 'hover:text-white text-slate-400'}`}
                title="Trasparente"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setBgClass('bg-white')} 
                className={`flex-1 p-1.5 rounded-md transition-all flex justify-center ${bgClass === 'bg-white' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-white text-slate-400'}`}
                title="Bianco"
              >
                <div className="w-4 h-4 rounded-full border border-slate-300 bg-white"></div>
              </button>
              <button 
                onClick={() => setBgClass('bg-black')} 
                className={`flex-1 p-1.5 rounded-md transition-all flex justify-center ${bgClass === 'bg-black' ? 'bg-slate-700 text-white shadow-sm' : 'hover:text-white text-slate-400'}`}
                title="Nero"
              >
                <div className="w-4 h-4 rounded-full border border-slate-600 bg-black"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Main Display Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Original */}
            {(viewMode === 'split' || viewMode === 'single') && (
               <div className={`relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 shadow-lg min-h-[300px] flex flex-col group ${viewMode === 'single' ? 'hidden' : ''}`}>
                <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
                  Originale
                </div>
                <img 
                  src={originalImage} 
                  alt="Original" 
                  className="w-full h-full object-contain bg-slate-900"
                />
              </div>
            )}

            {/* Processed */}
            <div className={`relative rounded-2xl overflow-hidden border-2 ${isPickingColor ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-crosshair' : 'border-slate-700'} ${bgClass} shadow-xl min-h-[300px] flex flex-col ${viewMode === 'single' ? 'md:col-span-2' : ''}`}>
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg backdrop-blur-md ${isPickingColor ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-600/90'}`}>
                  {isPickingColor ? 'SELEZIONA COLORE SFONDO' : 'Risultato'}
                </span>
                {isProcessing && <span className="text-xs text-indigo-600 font-bold bg-white/90 px-2 py-1 rounded-full">Elaborazione...</span>}
              </div>
              
              <img 
                src={isPickingColor ? rawDataUrl : processedDataUrl} 
                alt="Processed" 
                className="w-full h-full object-contain transition-opacity duration-200"
                style={{ opacity: isProcessing ? 0.8 : 1 }}
                onClick={handleImageClick}
              />
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200">
            <p className="flex gap-2">
              <span className="font-bold">💡 Suggerimento:</span>
              <span>
                Usa la <b>Pipetta</b> se lo sfondo non viene rimosso correttamente. In modalità "Inversione", lo sfondo di default da rimuovere è Magenta, altrimenti è Verde.
              </span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
