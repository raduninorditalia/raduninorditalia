
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const identifyCarFromImage = async (base64Image: string, mimeType: string) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Configurazione API Key mancante. Assicurati che GEMINI_API_KEY sia impostata.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: "Identifica la marca e il modello esatto dell'auto in questa foto. Rispondi SOLO con il nome dell'auto (es: 'Ferrari 488 Pista'). Se non sei sicuro o non ci sono auto, rispondi 'Sconosciuta'."
          }
        ]
      },
      config: {
        temperature: 0.3,
      }
    });
    
    return response.text?.trim() || "Sconosciuta";
  } catch (error: any) {
    console.error("Errore analisi AI:", error);
    throw new Error(error.message || "Problema di comunicazione con l'intelligenza artificiale.");
  }
};
