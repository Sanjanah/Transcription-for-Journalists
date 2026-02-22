import { GoogleGenAI, Chat } from "@google/genai";
import { fileToGenerativePart, formatTime, CHUNK_DURATION_SECONDS } from "../utils/fileHelper";
import { MediaFile } from "../types";

const apiKey = process.env.API_KEY || '';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const transcribeMedia = async (mediaFile: MediaFile): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = 'gemini-3-flash-preview'; 
  
  if (mediaFile.type === 'youtube' && mediaFile.youtubeUrl) {
    try {
      const prompt = `
        You are a professional transcription assistant for journalists. 
        Please transcribe the following YouTube video with high accuracy.
        
        Requirements:
        1. Language: Transcribe strictly in the original spoken language. DO NOT TRANSLATE.
        2. Timecodes: Provide a timestamp at the start of every new speaker or paragraph (format: [MM:SS]). 
        3. Speaker Identification: Identify speakers (e.g., "Speaker 1:", "Interviewer:", "Subject:") if possible.
        4. Formatting: Use clear paragraph breaks.
        5. Verbatim: Keep the transcription verbatim but remove excessive filler words (um, ah) unless they add context to the hesitation.
        
        Output only the transcription text. Do not add introductory or concluding remarks.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Transcribe this video: ${mediaFile.youtubeUrl}\n\n${prompt}`,
        config: {
          tools: [{ googleSearch: {} }, { urlContext: {} }]
        }
      });

      if (response.text) {
        return response.text;
      } else {
         throw new Error("Empty response from model");
      }
    } catch (error: any) {
      console.error(`Failed to transcribe YouTube video:`, error);
      throw new Error(`Failed to transcribe YouTube video. ${error.message}`);
    }
  }

  const files = mediaFile.processedFiles || [];
  const fullTranscriptionParts: string[] = [];
  const MAX_RETRIES = 3;

  // Process files sequentially to maintain order and manage rate limits
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Calculate time context
    const isChunked = files.length > 1;
    const startTimeSeconds = i * CHUNK_DURATION_SECONDS;
    const formattedStartTime = formatTime(startTimeSeconds);
    
    // Context string for the prompt
    const partInfo = isChunked 
      ? `(Part ${i + 1} of ${files.length}). IMPORTANT: This audio segment starts at ${formattedStartTime} of the full recording.` 
      : '';
      
    // Add a polite delay between chunks to avoid rate limiting
    if (i > 0) {
      await delay(2000); // 2 second delay between chunks
    }
    
    let attempts = 0;
    let success = false;
    
    while (attempts < MAX_RETRIES && !success) {
      try {
        const mediaPart = await fileToGenerativePart(file);

        const prompt = `
          You are a professional transcription assistant for journalists. 
          Please transcribe the following audio/video file ${partInfo} with high accuracy.
          
          Requirements:
          1. Language: Transcribe strictly in the original spoken language. DO NOT TRANSLATE.
          2. Timecodes: Provide a timestamp at the start of every new speaker or paragraph (format: [MM:SS]). 
             ${isChunked ? `CRITICAL: Since this is Part ${i + 1}, your first timestamp MUST start around [${formattedStartTime}] (or later depending on when speech starts), NOT [00:00]. Calculate all subsequent timestamps relative to this start time.` : ''}
          3. Speaker Identification: Identify speakers (e.g., "Speaker 1:", "Interviewer:", "Subject:") if possible.
          4. Formatting: Use clear paragraph breaks.
          5. Verbatim: Keep the transcription verbatim but remove excessive filler words (um, ah) unless they add context to the hesitation.
          
          Output only the transcription text. Do not add introductory or concluding remarks.
        `;

        const response = await ai.models.generateContent({
          model: modelId,
          contents: {
            parts: [mediaPart, { text: prompt }]
          },
        });

        if (response.text) {
          fullTranscriptionParts.push(response.text);
          success = true;
        } else {
           throw new Error("Empty response from model");
        }
        
      } catch (error: any) {
        attempts++;
        console.error(`Attempt ${attempts} failed for part ${i + 1}:`, error);
        
        if (attempts >= MAX_RETRIES) {
          throw new Error(`Failed to transcribe part ${i + 1} after ${MAX_RETRIES} attempts. ${error.message}`);
        }
        
        // Exponential backoff for retries
        await delay(2000 * attempts);
      }
    }
  }

  if (fullTranscriptionParts.length === 0) {
    throw new Error("No transcription text returned from the model.");
  }

  // Join seamlessly with double newline for paragraph separation, but no text delimiters
  return fullTranscriptionParts.join("\n\n");
};

export const translateTranscript = async (text: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are an expert linguist and cultural translator specializing in international journalism. 
    Your task is to translate the following transcript into English.

    SOURCE TEXT:
    ${text}

    GUIDELINES FOR TRANSLATION:
    1. **Nuance & Subtext**: Do not produce a literal machine translation. Capture the speaker's intent, emotional tone, and the subtext of the conversation.
    2. **Idioms & Aphorisms**: 
       - If an idiom has a direct English equivalent, use it.
       - If an idiom is culturally specific and untranslatable, translate the literal meaning but provide the context or intended meaning in square brackets immediately after. Example: "He bought a cat in a sack [made a purchase without inspecting it first]."
    3. **Transliterations**: For specific cultural terms, names, or places that should not be translated, use standard English transliteration.
    4. **Context**: Ensure the flow of conversation feels natural in English while remaining faithful to the original source.
    5. **Structure**: PRESERVE all timecodes [MM:SS] and Speaker Labels exactly as they appear in the source. Do not alter the structure of the document.

    Output the full English translation below:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: prompt }]
      },
    });

    if (!response.text) {
      throw new Error("Translation failed to generate text.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate transcript. " + error.message);
  }
};

export const createChatSession = (transcription: string): Chat => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are an AI assistant for a journalist. You have been provided with a transcript of an interview or event. 
      
      TRANSCRIPT CONTEXT:
      ${transcription}
      
      YOUR ROLE:
      Help the journalist analyze this text. You can summarize, extract quotes, identify key themes, or answer specific questions.
      
      FORMATTING RULES - STRICTLY FOLLOW:
      1. Do NOT use Markdown characters like '#', '*', or '_' in your output.
      2. For section headers, use UPPERCASE letters on a new line.
      3. Use blank lines to separate paragraphs and sections.
      4. Use simple hyphens (-) for lists.
      
      CITATION & QUOTING RULES:
      1. Always cite specific parts of the text if possible, referencing the timecodes [MM:SS].
      2. If you extract quotes, and the original transcript language is different from your response language (e.g. translating a quote), you MUST include the original text in brackets.
      
      Format for translated quotes:
      "English Translation of Quote" [Original: "Original text from transcript"]
      
      Keep answers professional, concise, clean, and accurate to the provided text.
      `
    }
  });
};