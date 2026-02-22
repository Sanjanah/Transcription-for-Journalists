import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "Transcribe this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      config: {
        tools: [{ googleSearch: {} }, { urlContext: {} }]
      }
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}

test();
