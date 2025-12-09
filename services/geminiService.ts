import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Sends an image to Gemini to replace the background with a specific color.
 * We use Pure Digital Green (#00FF00) as it offers the best luminance separation.
 */
export const removeImageBackground = async (
  base64Image: string,
  mimeType: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: 'Change the background of this image to a solid, pure Digital Green (#00FF00). The background must be completely flat with NO shadows, NO gradients, and NO ambient occlusion. Keep the subject exactly as is, with sharp and distinct edges. Do not crop the subject.',
          },
        ],
      },
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No content received from Gemini.");
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the response.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};