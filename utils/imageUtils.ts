import { RGB, RemovalPreset } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
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

export const resizeImage = (base64Image: string, maxWidth: number = 1536): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `data:image/png;base64,${base64Image}`;
    
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      // Use high quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      // Return as base64 without prefix
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = reject;
  });
};

export const invertImage = (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `data:image/png;base64,${base64Image}`;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for(let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // R
        data[i+1] = 255 - data[i+1]; // G
        data[i+2] = 255 - data[i+2]; // B
        // Alpha (i+3) remains unchanged
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = reject;
  });
};

/**
 * Advanced Interactive Background Removal
 */
export const removeBackgroundDynamic = (
  base64Image: string, 
  threshold = 20, 
  smoothing = 10,
  keyColor?: RGB,
  preset: RemovalPreset = 'green'
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

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const len = data.length;
      
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let difference = 0;

        if (keyColor) {
          // MANUAL MODE
          difference = Math.sqrt(
            Math.pow(r - keyColor.r, 2) +
            Math.pow(g - keyColor.g, 2) +
            Math.pow(b - keyColor.b, 2)
          ) / 3;
        } else {
          // AUTO MODE
          if (preset === 'green') {
            // Green Difference Key: G - max(R, B)
            difference = g - Math.max(r, b);
          } else {
            // Magenta MODE (For Dark Backgrounds)
            // Use Euclidean Distance from Pure Magenta (255, 0, 255)
            // This prevents "dark purple" (shadows on black objects) from being removed
            // as they are geometrically far from pure magenta.
            difference = 255 - (Math.sqrt(
              Math.pow(r - 255, 2) +
              Math.pow(g - 0, 2) +
              Math.pow(b - 255, 2)
            ) / 1.7); // 1.7 normalization factor
          }
        }

        let alpha = 255;

        // KEYING LOGIC
        if (keyColor) {
           if (difference < threshold) {
             alpha = 0;
           } else if (difference < threshold + smoothing) {
             const t = (difference - threshold) / smoothing;
             alpha = Math.floor(t * 255);
           }
        } else {
          // For Auto modes
          if (preset === 'green') {
             // Difference Key logic (Higher is more green)
             if (difference > threshold) {
                alpha = 0;
              } else if (difference > threshold - smoothing) {
                const t = (threshold - difference) / smoothing;
                alpha = Math.floor(t * 255);
              }
          } else {
            // Magenta Distance logic (Higher is closer to magenta)
             if (difference > (255 - threshold)) { // Inverted threshold logic for distance
                alpha = 0;
              } else if (difference > (255 - threshold - smoothing)) {
                const t = ((255 - threshold) - difference) / smoothing;
                alpha = Math.floor(t * 255);
              }
          }
        }

        // DESPILL LOGIC
        if (!keyColor && alpha > 0) {
           if (preset === 'green') {
             // Green Despill: Clamp G to max(R, B)
             const maxRB = Math.max(r, b);
             if (g > maxRB) data[i + 1] = maxRB;
           } else {
             // Magenta Despill: Darken Purple Fringing
             // If pixel is predominantly purple (high R/B, low G), clamp R and B down to G.
             // This turns purple edges into neutral black/dark grey, blending with the dark subject.
             // Condition: Is it somewhat purple?
             if (r > g && b > g) {
                // Strong despill: Set R and B to G
                data[i] = g;     // R
                data[i + 2] = g; // B
             }
           }
        }

        data[i + 3] = alpha;
      }

      ctx.putImageData(imageData, 0, 0);
      const resultBase64 = canvas.toDataURL('image/png').split(',')[1];
      resolve(resultBase64);
    };

    img.onerror = (err) => reject(err);
  });
};