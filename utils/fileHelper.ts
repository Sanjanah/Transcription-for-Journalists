export const CHUNK_DURATION_SECONDS = 180; // 3 minutes

export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

export const downloadText = (text: string, filename: string) => {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Compression & Segmentation Helpers ---

/**
 * Processes a media file. If it's small, returns it as is.
 * If it's large or video, extracts audio, downsamples to 16kHz Mono WAV.
 * If the resulting WAV is still > 10MB, splits it into chunks.
 */
export const processMediaFile = async (file: File): Promise<File[]> => {
  // If it's a small audio file, just return it directly to save processing time
  // 10MB limit to be safe for API (inline data limit is ~20MB, but safer is better)
  if (file.type.startsWith('audio/') && file.size < 10 * 1024 * 1024) {
    return [file];
  }

  try {
    // 1. Create AudioContext
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 2. Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // 3. Decode Audio Data (extracts audio from video or decodes audio file)
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // 4. Offline Processing: Resample to 16kHz Mono
    const targetSampleRate = 16000;
    const targetChannels = 1;
    
    const offlineCtx = new OfflineAudioContext(
      targetChannels, 
      audioBuffer.duration * targetSampleRate, 
      targetSampleRate
    );
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    const resampledBuffer = await offlineCtx.startRendering();
    
    // 5. Check if we need to chunk
    // 16kHz 16-bit mono = 32,000 bytes/sec
    const bytesPerSample = 2; // 16-bit
    const samplesPerChunk = targetSampleRate * CHUNK_DURATION_SECONDS;
    const pcmData = resampledBuffer.getChannelData(0);
    const totalSamples = pcmData.length;
    
    const chunks: File[] = [];
    let offset = 0;
    let chunkIndex = 0;
    
    while (offset < totalSamples) {
      const length = Math.min(samplesPerChunk, totalSamples - offset);
      const chunkPCM = pcmData.slice(offset, offset + length);
      
      const wavBlob = encodeWAV(chunkPCM, targetSampleRate);
      const chunkFile = new File(
        [wavBlob], 
        `segment_${chunkIndex}_${file.name}.wav`, 
        { type: "audio/wav" }
      );
      
      chunks.push(chunkFile);
      
      offset += length;
      chunkIndex++;
    }
    
    return chunks;
    
  } catch (error) {
    console.error("Processing error:", error);
    throw new Error("Failed to process media file. The file might be corrupt or incompatible.");
  }
};

const encodeWAV = (samples: Float32Array, sampleRate: number): Blob => {
  const numChannels = 1;
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const bufferLength = samples.length;
  const byteRate = sampleRate * blockAlign;
  const dataByteCount = bufferLength * blockAlign;
  
  const bufferArr = new ArrayBuffer(44 + dataByteCount);
  const view = new DataView(bufferArr);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataByteCount, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataByteCount, true);
  
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < bufferLength; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i])); // clamp
    // scale to 16-bit integer
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  
  return new Blob([view], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};