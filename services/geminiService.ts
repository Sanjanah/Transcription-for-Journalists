import { GoogleGenAI, Chat } from "@google/genai";
import { fileToGenerativePart } from "../utils/fileHelper";

const apiKey = process.env.API_KEY || '';

export const transcribeMedia = async (file: File): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Choose model based on media type logic or desired capability. 
  // 'gemini-3-flash-preview' is excellent for multimodal tasks and faster than Pro.
  // 'gemini-3-pro-preview' might be slightly better for complex reasoning, but Flash is the multimodal workhorse.
  const modelId = 'gemini-3-flash-preview'; 

  try {
    const mediaPart = await fileToGenerativePart(file);

    const prompt = `
      You are a professional transcription assistant for journalists. 
      Please transcribe the following audio/video file with high accuracy.
      
      Requirements:
      1. Speaker Identification: Identify speakers (e.g., "Speaker 1:", "Interviewer:", "Subject:") if possible.
      2. Formatting: Use clear paragraph breaks.
      3. Verbatim: Keep the transcription verbatim but remove excessive filler words (um, ah) unless they add context to the hesitation.
      4. Structure: If there are distinct sections, separate them clearly.
      
      Output only the transcription. Do not add introductory or concluding remarks.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [mediaPart, { text: prompt }]
      },
    });

    if (!response.text) {
      throw new Error("No transcription text returned from the model.");
    }

    return response.text;

  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    throw new Error(error.message || "An unexpected error occurred during transcription.");
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
      1. Always cite specific parts of the text if possible.
      2. If you extract quotes, and the original transcript language is different from your response language (e.g. translating a quote), you MUST include the original text in brackets.
      
      Format for translated quotes:
      "English Translation of Quote" [Original: "Original text from transcript"]
      
      Keep answers professional, concise, clean, and accurate to the provided text.
      `
    }
  });
};