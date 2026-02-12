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
  file: File;
  previewUrl: string;
  type: 'audio' | 'video';
}