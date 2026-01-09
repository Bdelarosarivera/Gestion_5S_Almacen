
import { GoogleGenAI } from "@google/genai";

export const editImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  // Inicialización directa según las directrices de seguridad y estabilidad
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
    const data = base64Image.split(',')[1];

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
    
    // Extracción segura de la parte de imagen de la respuesta
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            resultImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
        }
      }
    }

    if (!resultImage) {
        throw new Error("El modelo no generó una imagen. Por favor, intente con una instrucción diferente.");
    }

    return resultImage;

  } catch (error) {
    console.error("Error en Gemini Image Editor:", error);
    throw error;
  }
};
