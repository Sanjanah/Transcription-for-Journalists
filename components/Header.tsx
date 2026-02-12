import React from 'react';
import { Mic, FileAudio, Feather } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-journal-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-journal-900 text-white p-2 rounded-lg">
            <Feather size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-journal-900 tracking-tight">Veritas Scribe</h1>
            <p className="text-xs text-journal-500 hidden sm:block">Precision Journalism Tools</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center text-xs font-medium text-journal-500 bg-journal-50 px-3 py-1 rounded-full border border-journal-200">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Gemini 3.0 Flash Ready
          </div>
        </div>
      </div>
    </header>
  );
};