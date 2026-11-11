import { removeBackground } from '@imgly/background-removal';

export interface BackgroundRemovalOptions {
  onProgress?: (step: string, percent: number) => void;
}

/** Dekupe sonrası kart fotoğrafı için azami kenar uzunluğu (px). Kart zaten ≤360px genişlikte çiziliyor. */
const MAX_OUTPUT_SIDE = 900;

/**
 * Saydam PNG blob'unu küçültüp WebP (alfa kanallı) Data URL'e çevirir.
 * Tam çözünürlüklü PNG base64 birkaç MB tuttuğu için localStorage kotasını (~5 MB) aşıp
 * uygulamayı çökertiyordu; WebP + yeniden boyutlandırma ile yüzlerce KB'a iner.
 */
async function blobToCompactDataUrl(blob: Blob): Promise<string> {
  const bitmapUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context alınamadı');
    ctx.drawImage(img, 0, 0, w, h);

    const webp = canvas.toDataURL('image/webp', 0.85);
    // Bazı tarayıcılar webp desteklemezse PNG'ye düşer; yine de küçültülmüş olur.
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

/**
 * Removes background from an image file, blob, or base64 Data URL
 * using browser-side WebAssembly AI model (@imgly/background-removal).
 * Returns a compact transparent WebP Data URL.
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

    return await blobToCompactDataUrl(blob);
  } catch (error) {
    console.error('AI background removal failed:', error);
    throw error;
  }
}
