import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto h-64 md:h-80 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden group
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
          : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800/50 bg-slate-800/30'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
      />
      
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="z-10 flex flex-col items-center p-6 text-center animate-fade-in">
        <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isDragging ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-indigo-400 group-hover:bg-slate-600'}`}>
          {isDragging ? <UploadCloud className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
          {isDragging ? 'Rilascia qui l\'immagine' : 'Carica una foto'}
        </h3>
        <p className="text-slate-400 text-sm max-w-xs">
          Trascina e rilascia o clicca per selezionare (JPG, PNG)
        </p>
      </div>
    </div>
  );
};
