import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

/**
 * Sends an image to Gemini to replace the background with a specific color.
 * We use Pure Digital Green (#00FF00) as it offers the best luminance separation.
 */
export const removeImageBackground = async (
  base64Image: string,
  mimeType: string,
  useProModel: boolean = false
): Promise<string> => {
  // Initialize client inside function to capture the latest API Key
  const apiKey = process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  // Select model based on user tier (Pro Key vs Free)
  // gemini-3-pro-image-preview: Better instruction following, higher res, requires Key.
  // gemini-2.5-flash-image: Specialized image editing model. Faster, free, reliable for editing tasks.
  const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  console.log(`Using model: ${modelName}`);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
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
      config: {
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      },
    });

    // Check for safety blocks explicitly
    if (response.candidates?.[0]?.finishReason === 'PROHIBITED_CONTENT' || response.candidates?.[0]?.finishReason === 'SAFETY') {
      throw new Error("SAFETY_BLOCK");
    }

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      // Log more info if available
      console.error("Gemini Response Error", response);
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