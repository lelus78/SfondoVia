import React from 'react';
import { Camera, Sparkles, Key, CheckCircle } from 'lucide-react';

interface HeaderProps {
  hasApiKey: boolean;
  onConnectApiKey: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hasApiKey, onConnectApiKey }) => {
  return (
    <header className="w-full py-6 px-4 md:px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            SfondoVia AI
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Powered by Gemini</span>
          </div>

          <button
            onClick={onConnectApiKey}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              hasApiKey 
                ? 'bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20 cursor-default'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-indigo-400'
            }`}
          >
            {hasApiKey ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Pro Attivo
              </>
            ) : (
              <>
                <Key className="w-3 h-3" />
                Collega API Key (Opzionale)
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};