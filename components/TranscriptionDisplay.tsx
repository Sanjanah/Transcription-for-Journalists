import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Download, Type, RotateCcw, Search, ChevronUp, ChevronDown, X, Globe, Languages, FileBarChart } from 'lucide-react';
import { Button } from './Button';
import { copyToClipboard, downloadText } from '../utils/fileHelper';

interface TranscriptionDisplayProps {
  text: string;
  translatedText?: string;
  onReset: () => void;
  onTranslate?: () => void;
  isTranslating?: boolean;
  onGenerateSummary?: () => void;
  isGeneratingSummary?: boolean;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  text,
  translatedText,
  onReset,
  onTranslate,
  isTranslating = false,
  onGenerateSummary,
  isGeneratingSummary = false
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'original' | 'translated'>('original');

  // Automatically switch to translated view when translation is ready
  useEffect(() => {
    if (translatedText) {
      setViewMode('translated');
    }
  }, [translatedText]);

  const activeText = viewMode === 'translated' ? (translatedText || '') : text;

  const handleCopy = async () => {
    const success = await copyToClipboard(activeText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const prefix = viewMode === 'translated' ? 'translated-' : 'original-';
    downloadText(activeText, `${prefix}transcription-${new Date().toISOString().slice(0, 10)}.txt`);
  };

  // Process text to find matches
  const { processedParagraphs, totalMatches } = useMemo(() => {
    if (!searchQuery) {
      return { 
        processedParagraphs: activeText.split('\n').map(p => ({ text: p, parts: [{ text: p, isMatch: false, index: -1 }] })), 
        totalMatches: 0 
      };
    }

    let matchCount = 0;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); // Escape special chars

    const paragraphs = activeText.split('\n').map(paragraph => {
      if (!paragraph.trim()) return { text: paragraph, parts: [{ text: paragraph, isMatch: false, index: -1 }] };
      
      const parts = paragraph.split(regex).map(part => {
        if (part.toLowerCase() === searchQuery.toLowerCase()) {
          const index = matchCount;
          matchCount++;
          return { text: part, isMatch: true, index };
        }
        return { text: part, isMatch: false, index: -1 };
      });
      return { text: paragraph, parts };
    });

    return { processedParagraphs: paragraphs, totalMatches: matchCount };
  }, [activeText, searchQuery]);

  // Reset match index when query changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  // Scroll to match
  useEffect(() => {
    if (totalMatches > 0) {
      const element = document.getElementById(`match-${currentMatchIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, totalMatches]);

  const handleNextMatch = () => {
    setCurrentMatchIndex(prev => (prev + 1) % totalMatches);
  };

  const handlePrevMatch = () => {
    setCurrentMatchIndex(prev => (prev - 1 + totalMatches) % totalMatches);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-journal-200 overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 border-b border-journal-100 bg-journal-50 gap-3">
        
        {/* View Toggle */}
        <div className="flex bg-white rounded-lg p-1 border border-journal-200 shadow-sm">
           <button 
             onClick={() => setViewMode('original')}
             className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
               viewMode === 'original' 
               ? 'bg-journal-100 text-journal-900 shadow-sm' 
               : 'text-journal-500 hover:text-journal-700 hover:bg-journal-50'
             }`}
           >
             Original
           </button>
           <button 
             onClick={() => {
               if (translatedText) setViewMode('translated');
               else if (onTranslate) onTranslate();
             }}
             disabled={isTranslating}
             className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
               viewMode === 'translated' 
               ? 'bg-journal-100 text-journal-900 shadow-sm' 
               : 'text-journal-500 hover:text-journal-700 hover:bg-journal-50'
             }`}
           >
             {isTranslating ? (
                <>
                  <div className="animate-spin h-3 w-3 border-b-2 border-journal-400 rounded-full"></div>
                  Translating...
                </>
             ) : (
                <>
                  English
                  {!translatedText && <Globe size={10} />}
                </>
             )}
           </button>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-sm w-full relative group">
          <div className="flex items-center bg-white border border-journal-200 rounded-md px-3 py-2 focus-within:border-journal-400 focus-within:ring-1 focus-within:ring-journal-200 transition-all shadow-sm">
            <Search size={14} className="text-journal-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search transcript..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder-journal-400 min-w-0 text-journal-900"
            />
            {searchQuery && (
              <div className="flex items-center gap-1 pl-2 border-l border-journal-100">
                 <span className="text-xs text-journal-400 whitespace-nowrap mr-1">
                   {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '0 matches'}
                 </span>
                 <button 
                   onClick={handlePrevMatch}
                   disabled={totalMatches === 0}
                   className="p-0.5 hover:bg-journal-100 rounded text-journal-500 disabled:opacity-30"
                 >
                   <ChevronUp size={14} />
                 </button>
                 <button 
                   onClick={handleNextMatch}
                   disabled={totalMatches === 0}
                   className="p-0.5 hover:bg-journal-100 rounded text-journal-500 disabled:opacity-30"
                 >
                   <ChevronDown size={14} />
                 </button>
                 <button 
                   onClick={clearSearch}
                   className="p-0.5 hover:bg-red-50 text-journal-400 hover:text-red-500 rounded ml-1"
                 >
                   <X size={14} />
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
           {!translatedText && !isTranslating && viewMode === 'original' && (
             <Button variant="secondary" size="sm" onClick={onTranslate} className="h-8 md:px-3 text-xs">
                <Languages size={14} className="mr-1.5" />
                Translate to English
             </Button>
           )}

          <Button
            variant="primary"
            size="sm"
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary}
            title="Generate a professional readout"
            className="h-8 md:px-3 text-xs shadow-sm"
          >
            {isGeneratingSummary ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full mr-1.5"></div>
                <span className="hidden md:inline">Generating...</span>
              </>
            ) : (
              <>
                <FileBarChart size={14} className="md:mr-1.5" />
                <span className="hidden md:inline">Generate Readout</span>
              </>
            )}
          </Button>

          <div className="h-4 w-px bg-journal-300 mx-1 hidden md:block"></div>

          <Button variant="outline" size="sm" onClick={handleCopy} title="Copy to clipboard" className="h-8 w-8 px-0 md:w-auto md:px-3">
            {copied ? <Check size={14} className="md:mr-1.5" /> : <Copy size={14} className="md:mr-1.5" />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} title="Download as .txt" className="h-8 w-8 px-0 md:w-auto md:px-3">
            <Download size={14} className="md:mr-1.5" />
            <span className="hidden md:inline">TXT</span>
          </Button>
          <div className="h-4 w-px bg-journal-300 mx-1 hidden md:block"></div>
          <Button variant="ghost" size="sm" onClick={onReset} className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 px-0 md:w-auto md:px-3">
            <RotateCcw size={14} className="md:mr-1.5" />
            <span className="hidden md:inline">New</span>
          </Button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-white relative">
        {isTranslating && viewMode === 'translated' ? (
          <div className="flex flex-col items-center justify-center h-full text-journal-400">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-journal-400 mb-4"></div>
             <p className="animate-pulse font-medium">Translating transcript...</p>
             <p className="text-xs mt-2 opacity-70">Capturing nuances and context</p>
          </div>
        ) : (
          <article className="prose prose-journal max-w-none">
            {viewMode === 'translated' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Globe className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      This is an AI-generated translation focusing on cultural nuance and context. 
                      Original idioms may be explained in brackets.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {processedParagraphs.map((paragraph, pIdx) => (
               <p key={pIdx} className="mb-6 text-journal-800 font-serif leading-relaxed text-lg">
                  {paragraph.parts.map((part, partIdx) => {
                    if (part.isMatch) {
                      return (
                        <mark 
                          key={partIdx} 
                          id={`match-${part.index}`}
                          onClick={() => setCurrentMatchIndex(part.index)}
                          className={`${
                            currentMatchIndex === part.index 
                              ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-300 z-10 scale-105' 
                              : 'bg-yellow-300 text-journal-900 border-b-2 border-yellow-400 hover:bg-yellow-400'
                          } rounded-[2px] px-0.5 mx-0.5 transition-all duration-200 cursor-pointer inline-block`}
                        >
                          {part.text}
                        </mark>
                      );
                    }
                    
                    // Style timecodes specifically (e.g., [00:12])
                    // Split the text part by timecode regex to insert styled spans
                    const timecodeRegex = /(\[\d{2}:\d{2}\])/g;
                    const fragments = part.text.split(timecodeRegex);
                    
                    return (
                      <span key={partIdx}>
                        {fragments.map((frag, fragIdx) => (
                          timecodeRegex.test(frag) ? (
                            <span key={fragIdx} className="text-journal-400 font-sans text-sm font-medium mr-2 select-none tracking-wide">
                              {frag}
                            </span>
                          ) : (
                            <span key={fragIdx}>{frag}</span>
                          )
                        ))}
                      </span>
                    );
                  })}
               </p>
            ))}
          </article>
        )}
      </div>
    </div>
  );
};