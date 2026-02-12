import React, { useRef, useState } from 'react';
import { Upload, Music, Video, AlertCircle, FileAudio } from 'lucide-react';
import { Button } from './Button';
import { MediaFile } from '../types';

interface MediaUploaderProps {
  onFileSelect: (media: MediaFile) => void;
  isLoading: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndProcessFile = (file: File) => {
    setError(null);
    
    // Check file type
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');

    if (!isAudio && !isVideo) {
      setError("Please upload a valid audio or video file.");
      return;
    }

    // Size limit check (approx 50MB to be safe with browser memory for base64)
    if (file.size > 50 * 1024 * 1024) {
      setError("File is too large for this demo (limit 50MB). Please compress or trim the file.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onFileSelect({
      file,
      previewUrl,
      type: isAudio ? 'audio' : 'video'
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      <div 
        className={`
          relative w-full max-w-2xl flex flex-col items-center justify-center 
          p-12 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out
          ${dragActive ? 'border-journal-900 bg-journal-50' : 'border-journal-300 bg-white hover:border-journal-400'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="audio/*,video/*"
          onChange={handleChange}
        />
        
        <div className="w-20 h-20 bg-journal-100 rounded-full flex items-center justify-center mb-6 text-journal-600">
          <Upload size={32} />
        </div>

        <h3 className="text-2xl font-serif font-bold text-journal-900 mb-3 text-center">
          Upload Audio or Video
        </h3>
        
        <p className="text-journal-500 text-center mb-8 max-w-md">
          Drag and drop your interview, press briefing, or recording here. 
          Supported formats: MP3, WAV, MP4, MOV, WebM.
        </p>

        <div className="flex gap-4">
          <Button onClick={onButtonClick} size="lg" className="shadow-lg shadow-journal-900/10">
            Select File
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-journal-400 text-sm">
          <div className="flex items-center gap-2">
            <Music size={16} />
            <span>Crystal clear audio processing</span>
          </div>
          <div className="flex items-center gap-2">
            <Video size={16} />
            <span>Video context support</span>
          </div>
        </div>

        {error && (
          <div className="absolute bottom-4 left-0 right-0 mx-auto w-max max-w-[90%] bg-red-50 text-red-600 px-4 py-2 rounded-full border border-red-100 flex items-center gap-2 text-sm animate-bounce">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};