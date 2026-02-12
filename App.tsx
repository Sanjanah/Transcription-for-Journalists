import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaUploader } from './components/MediaUploader';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { AssistantPanel } from './components/AssistantPanel';
import { Button } from './components/Button';
import { MediaFile, TranscriptionStatus } from './types';
import { transcribeMedia } from './services/geminiService';
import { Play, Pause, AlertTriangle, FileAudio, FileVideo, Sparkles, FileText, MessageSquareText } from 'lucide-react';

const App: React.FC = () => {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>(TranscriptionStatus.IDLE);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'transcript' | 'assistant'>('transcript');

  useEffect(() => {
    let interval: number;
    if (status === TranscriptionStatus.TRANSCRIBING || status === TranscriptionStatus.PROCESSING_FILE) {
      interval = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleFileSelect = (file: MediaFile) => {
    setMediaFile(file);
    setError(null);
    setTranscription('');
    setStatus(TranscriptionStatus.IDLE);
    setActiveTab('transcript');
  };

  const handleTranscribe = async () => {
    if (!mediaFile) return;

    setStatus(TranscriptionStatus.PROCESSING_FILE);
    setError(null);

    try {
      setStatus(TranscriptionStatus.TRANSCRIBING);
      const result = await transcribeMedia(mediaFile.file);
      setTranscription(result);
      setStatus(TranscriptionStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStatus(TranscriptionStatus.ERROR);
    }
  };

  const handleReset = () => {
    setMediaFile(null);
    setTranscription('');
    setStatus(TranscriptionStatus.IDLE);
    setError(null);
    setActiveTab('transcript');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col font-sans text-journal-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Intro / Empty State */}
        {!mediaFile && (
          <div className="h-[calc(100vh-140px)]">
             <MediaUploader onFileSelect={handleFileSelect} isLoading={false} />
          </div>
        )}

        {/* Workspace State */}
        {mediaFile && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full lg:h-[calc(100vh-140px)]">
            
            {/* Left Panel: Media Preview & Controls */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-journal-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-journal-800 flex items-center gap-2">
                    {mediaFile.type === 'audio' ? <FileAudio size={18} /> : <FileVideo size={18} />}
                    Source Media
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleReset} disabled={status === TranscriptionStatus.TRANSCRIBING}>
                    Change File
                  </Button>
                </div>
                
                <div className="bg-journal-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center mb-4 relative group">
                  {mediaFile.type === 'video' ? (
                    <video 
                      src={mediaFile.previewUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-journal-800 relative">
                       <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/sound-waves.png')]"></div>
                       <audio src={mediaFile.previewUrl} controls className="relative z-10 w-3/4" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-journal-500">
                    <span>Filename:</span>
                    <span className="font-medium text-journal-900 truncate max-w-[200px]">{mediaFile.file.name}</span>
                  </div>
                  <div className="flex justify-between text-sm text-journal-500">
                    <span>Size:</span>
                    <span className="font-medium text-journal-900">{(mediaFile.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>

                <div className="mt-6">
                  {status === TranscriptionStatus.IDLE || status === TranscriptionStatus.ERROR ? (
                    <Button 
                      onClick={handleTranscribe} 
                      className="w-full h-12 text-lg shadow-md shadow-journal-900/5"
                    >
                      <Sparkles size={18} className="mr-2" />
                      Start Transcription
                    </Button>
                  ) : status === TranscriptionStatus.COMPLETED ? (
                     <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center font-medium border border-green-100">
                        Transcription Complete
                     </div>
                  ) : (
                    <div className="bg-journal-50 border border-journal-100 rounded-lg p-4 flex flex-col items-center justify-center py-8">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-journal-900 mb-3"></div>
                       <p className="text-journal-600 font-medium animate-pulse">
                         {status === TranscriptionStatus.PROCESSING_FILE ? "Processing file..." : "Transcribing..."}
                       </p>
                       <p className="text-xs text-journal-400 mt-2">Elapsed: {elapsedTime}s</p>
                    </div>
                  )}
                </div>
                
                 {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </div>

              {/* Tips Section */}
              <div className="bg-journal-50 p-4 rounded-xl border border-journal-200 hidden lg:block">
                 <h4 className="font-semibold text-journal-700 mb-2 text-sm">Pro Tips</h4>
                 <ul className="text-sm text-journal-500 space-y-2 list-disc pl-4">
                   <li>Switch to the Assistant tab to summarize the text.</li>
                   <li>The AI attempts to identify speakers automatically.</li>
                   <li>Use the search bar in the transcript view to find keywords.</li>
                 </ul>
              </div>
            </div>

            {/* Right Panel: Transcription Output or Assistant */}
            <div className="lg:col-span-8 h-full min-h-[500px] flex flex-col">
               <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setActiveTab('transcript')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'transcript' 
                        ? 'bg-journal-900 text-white shadow-sm' 
                        : 'bg-white text-journal-600 hover:bg-journal-50'
                    }`}
                  >
                    <FileText size={16} />
                    Transcript
                  </button>
                  <button
                    onClick={() => setActiveTab('assistant')}
                    disabled={!transcription}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === 'assistant' 
                        ? 'bg-journal-900 text-white shadow-sm' 
                        : 'bg-white text-journal-600 hover:bg-journal-50'
                    }`}
                  >
                    <MessageSquareText size={16} />
                    Assistant
                  </button>
                </div>

                <div className="flex-1 relative">
                  {activeTab === 'transcript' && (
                    transcription ? (
                       <TranscriptionDisplay text={transcription} onReset={handleReset} />
                    ) : (
                       <div className="h-full bg-white rounded-xl shadow-sm border border-journal-200 flex flex-col items-center justify-center text-center p-12">
                          <div className="w-16 h-16 bg-journal-50 rounded-full flex items-center justify-center mb-4 text-journal-300">
                            <FileAudio size={32} />
                          </div>
                          <h3 className="text-lg font-medium text-journal-400 mb-2">Ready to Transcribe</h3>
                          <p className="text-journal-400 max-w-xs mx-auto">
                            Click "Start Transcription" on the left to process your file using high-accuracy AI models.
                          </p>
                       </div>
                    )
                  )}
                  
                  {activeTab === 'assistant' && (
                     <AssistantPanel transcription={transcription} />
                  )}
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;