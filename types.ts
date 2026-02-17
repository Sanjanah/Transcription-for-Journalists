export enum TranscriptionStatus {
  IDLE = 'IDLE',
  PROCESSING_FILE = 'PROCESSING_FILE',
  TRANSCRIBING = 'TRANSCRIBING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface TranscriptionResult {
  text: string;
  wordCount: number;
  detectedLanguage?: string;
  speakersIdentified: boolean;
}

export interface MediaFile {
  originalFile: File;      // The original user file for display/preview
  processedFiles: File[];  // Array of chunks to send to API
  previewUrl: string;
  type: 'audio' | 'video';
}