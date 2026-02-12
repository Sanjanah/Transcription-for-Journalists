import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Download, Type, RotateCcw, Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from './Button';
import { copyToClipboard, downloadText } from '../utils/fileHelper';

interface TranscriptionDisplayProps {
  text: string;
  onReset: () => void;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ text, onReset }) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadText(text, `transcription-${new Date().toISOString().slice(0, 10)}.txt`);
  };

  // Process text to find matches
  const { processedParagraphs, totalMatches } = useMemo(() => {
    if (!searchQuery) {
      return { 
        processedParagraphs: text.split('\n').map(p => ({ text: p, parts: [{ text: p, isMatch: false, index: -1 }] })), 
        totalMatches: 0 
      };
    }

    let matchCount = 0;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); // Escape special chars

    const paragraphs = text.split('\n').map(paragraph => {
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
  }, [text, searchQuery]);

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
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 border-b border-journal-100 bg-journal-50 gap-3">
        <div className="flex items-center gap-2 text-journal-600">
          <Type size={16} />
          <span className="text-sm font-medium hidden sm:inline">Transcription</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md w-full relative group">
          <div className="flex items-center bg-white border border-journal-200 rounded-md px-2 py-1.5 focus-within:border-journal-400 focus-within:ring-1 focus-within:ring-journal-200 transition-all">
            <Search size={14} className="text-journal-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search transcript..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder-journal-300 min-w-0"
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

        <div className="flex items-center gap-2">
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
      
      <div className="flex-1 p-6 overflow-y-auto bg-white relative">
        <article className="prose prose-journal max-w-none">
          {processedParagraphs.map((paragraph, pIdx) => (
             <p key={pIdx} className="mb-4 text-journal-800 font-serif leading-relaxed text-lg">
                {paragraph.parts.map((part, partIdx) => 
                  part.isMatch ? (
                    <mark 
                      key={partIdx} 
                      id={`match-${part.index}`}
                      className={`${
                        currentMatchIndex === part.index 
                          ? 'bg-yellow-400 text-journal-900 font-medium' 
                          : 'bg-yellow-200 text-journal-800'
                      } rounded-[2px] px-0.5 transition-colors duration-200`}
                    >
                      {part.text}
                    </mark>
                  ) : (
                    <span key={partIdx}>{part.text}</span>
                  )
                )}
             </p>
          ))}
        </article>
      </div>
    </div>
  );
};