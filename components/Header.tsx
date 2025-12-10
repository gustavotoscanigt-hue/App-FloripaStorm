import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileVideo, Menu, Download } from 'lucide-react';

interface HeaderProps {
  onVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalysisUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onVideoUpload, onAnalysisUpload, onToggleSidebar }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    // Cast to any to avoid TypeScript errors with non-standard event
    window.addEventListener('beforeinstallprompt' as any, handler);
    return () => window.removeEventListener('beforeinstallprompt' as any, handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  return (
    <header className="bg-white border-b px-4 py-3 md:px-6 md:py-4 flex justify-between items-center shadow-sm z-20 sticky top-0 safe-area-top">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        <h1 className="text-lg md:text-xl font-bold text-indigo-700 flex items-center gap-2">
          <FileVideo className="w-6 h-6" /> 
          <span className="hidden xs:inline">BioMotion Pro</span>
        </h1>
      </div>

      <div className="flex gap-2 md:gap-3">
        {installPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-3 py-2 text-xs md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-2 transition shadow-sm animate-pulse"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="video/*"
          onChange={onVideoUpload}
        />
        <input
          type="file"
          ref={zipInputRef}
          className="hidden"
          accept=".zip"
          onChange={onAnalysisUpload}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-xs md:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2 transition"
        >
          <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Load Video</span>
        </button>
        <button
          onClick={() => zipInputRef.current?.click()}
          className="px-3 py-2 text-xs md:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2 transition"
        >
          <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Load Analysis</span>
        </button>
      </div>
    </header>
  );
};