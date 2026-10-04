import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateAnswer(prompt: string, model: string = "gemini-3.8-flash") {
  const response = await ai.models.generateContent({
    model: model || "gemini-3.8-flash",
    contents: prompt,
  });

  return response.text;
}