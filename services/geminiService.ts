
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Google AI API key not found. AI features will be disabled.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const generateIdeas = async (topic: string): Promise<string> => {
  if (!ai) {
    throw new Error("Gemini API is not initialized. Please provide an API key.");
  }
  
  const prompt = `
    You are an expert UX designer and product manager brainstorming for a secure, offline-first digital vault application.
    The app currently allows users to store passwords, credit cards, bookmarks, and notes.
    The core concept is privacy and user control, with data stored locally and portable via an export/import system that requires a unique user-generated ID.

    Based on the user's topic of interest, generate creative, actionable ideas to enhance the application. 
    Format your response clearly with headings and bullet points. Be concise but inspiring.

    User's Topic: "${topic}"

    Brainstorm now:
    `;

  try {
    const response = await ai.models.generateContent({
        // Fix: Updated model name to 'gemini-flash-lite-latest' as per the guidelines for "gemini lite".
        model: 'gemini-flash-lite-latest',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Could not get a response from the AI. Please check your connection or API key.");
  }
};

export const fetchWebsiteTitle = async (url: string): Promise<string> => {
    if (!ai) {
        throw new Error("Gemini API is not initialized. Please provide an API key.");
    }

    const prompt = `Based on the URL "${url}", suggest a short, user-friendly title for this website. For example, for "https://app.google.com/mail", you should suggest "Google Mail". Only return the title as a plain string, without any markdown or extra text.`;

    try {
        const response = await ai.models.generateContent({
            // Fix: Updated model name to 'gemini-flash-lite-latest' as per the guidelines for "gemini lite".
            model: 'gemini-flash-lite-latest',
            contents: prompt,
        });
        
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for title fetching:", error);
        throw new Error("Could not get a response from the AI.");
    }
};
