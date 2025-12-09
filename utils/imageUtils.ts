import { RGB } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getMimeType = (file: File): string => {
  return file.type;
};

export const downloadImage = (base64Data: string, filename: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${base64Data}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Advanced Interactive Background Removal
 * Supports two modes:
 * 1. Auto (Green Screen): Uses channel difference (G - max(R, B)). Best for standard Gemini output.
 * 2. Manual (Key Color): Uses Euclidean distance from a specific user-picked color. Best for complex shadows.
 */
export const removeBackgroundDynamic = (
  base64Image: string, 
  threshold = 20, 
  smoothing = 10,
  keyColor?: RGB
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `data:image/png;base64,${base64Image}`;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const len = data.length;
      
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let difference = 0;

        if (keyColor) {
          // MANUAL MODE: Euclidean Distance from selected color
          // We assume the user picked the exact background shade they want gone.
          // Distance = sqrt((r1-r2)^2 + ...)
          // We normalize slightly to match the threshold scale (0-100 approx)
          difference = Math.sqrt(
            Math.pow(r - keyColor.r, 2) +
            Math.pow(g - keyColor.g, 2) +
            Math.pow(b - keyColor.b, 2)
          ) / 3; // Divide by 3 to bring range closer to 0-100 for slider consistency
        } else {
          // AUTO MODE: Green Difference Keying (VFX Standard)
          // Greenness = G - max(R, B)
          const maxRB = Math.max(r, b);
          difference = g - maxRB;
        }

        let alpha = 255;

        // KEYING LOGIC
        // Note: For Manual Mode, logic is inverted (Low distance = Background).
        // But for code simplicity, let's normalize "difference" to mean "Likelihood of being background".
        
        // Adjust logic for Manual Mode to match variable naming
        let isBackground = false;
        let softness = 0;

        if (keyColor) {
           // If distance is LOW, it is background.
           // Invert difference for calculation: 100 - distance (clamped)
           // Actually simpler: 
           if (difference < threshold) {
             alpha = 0; // It's the color -> Transparent
           } else if (difference < threshold + smoothing) {
             // Edge
             const t = (difference - threshold) / smoothing; // 0..1
             alpha = Math.floor(t * 255);
           }
        } else {
          // AUTO MODE: High Greenness = Background
          if (difference > threshold) {
            alpha = 0;
          } else if (difference > threshold - smoothing) {
            const t = (threshold - difference) / smoothing; // 0..1
            alpha = Math.floor(t * 255);
          }
        }

        // DESPILL LOGIC (Only needed for Green Screen Auto Mode really, but good for safety)
        if (!keyColor && alpha > 0) {
           const maxRB = Math.max(r, b);
           if (g > maxRB) {
             data[i + 1] = maxRB;
           }
        }

        data[i + 3] = alpha;
      }

      // Put the modified data back
      ctx.putImageData(imageData, 0, 0);

      // Return as base64 PNG
      const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };

    img.onerror = (err) => reject(err);
  });
};