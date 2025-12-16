import { GoogleGenAI } from "@google/genai";

// Safety check: ensure process.env exists, otherwise default to empty string to prevent crash
const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';

// Initialize AI only if key exists, otherwise we'll handle it in the function calls
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const editImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  if (!ai) {
    throw new Error("API Key no configurada. Asegúrese de tener una API_KEY válida en su entorno.");
  }

  try {
    // Determine mimeType (simplified assumption for base64 strings usually starting with data:image/...)
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
    const data = base64Image.split(',')[1]; // Remove header

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let resultImage = '';
    
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            resultImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
        }
      }
    }

    if (!resultImage) {
        throw new Error("No image returned from Gemini. Ensure the prompt asks for an image modification.");
    }

    return resultImage;

  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    throw error;
  }
};