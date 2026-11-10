import { removeBackground } from '@imgly/background-removal';

export interface BackgroundRemovalOptions {
  onProgress?: (step: string, percent: number) => void;
}

/**
 * Removes background from an image file, blob, or base64 Data URL
 * using browser-side WebAssembly AI model (@imgly/background-removal).
 * Returns transparent WebP/PNG Data URL.
 */
export async function removeImageBackground(
  imageSource: string | File | Blob,
  options?: BackgroundRemovalOptions
): Promise<string> {
  try {
    const blob = await removeBackground(imageSource, {
      progress: (key: string, current: number, total: number) => {
        if (options?.onProgress && total > 0) {
          const percent = Math.min(100, Math.round((current / total) * 100));
          options.onProgress(key, percent);
        }
      },
      model: 'isnet_quint8', // fast quantized client-side inference
    });

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('AI background removal failed:', error);
    throw error;
  }
}
