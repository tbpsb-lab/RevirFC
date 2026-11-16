export interface BackgroundRemovalOptions {
  onProgress?: (step: string, percent: number) => void;
}

/** Dekupe sonrası kart fotoğrafı için azami kenar uzunluğu (px). 960px Retina kalitesinde net görünüm + minimum boyut sağlar. */
const MAX_OUTPUT_SIDE = 960;

/**
 * Corner-connected near-black background cleaner (e.g. if a PNG with black matte
 * was re-encoded without alpha by WhatsApp or phone gallery).
 * Only removes pixels connected to the outer edges with dark neutral RGB so hair/eyes stay intact.
 */
function cleanCornerBlackMatte(ctx: CanvasRenderingContext2D, w: number, h: number, threshold = 22) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isDarkBg = (idx: number) => {
    const p = idx * 4;
    const a = data[p + 3];
    if (a < 15) return true;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    return maxC <= threshold && (maxC - minC) <= 10;
  };

  const enqueue = (idx: number) => {
    if (idx < 0 || idx >= total || visited[idx]) return;
    if (!isDarkBg(idx)) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  // Seed outer perimeter pixels
  for (let x = 0; x < w; x++) {
    enqueue(x);
    enqueue((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    enqueue(y * w);
    enqueue(y * w + (w - 1));
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * 4 + 3] = 0;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) enqueue(idx - 1);
    if (x + 1 < w) enqueue(idx + 1);
    if (y > 0) enqueue(idx - w);
    if (y + 1 < h) enqueue(idx + w);
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Saydam PNG blob'unu küçültüp WebP (alfa kanallı) Data URL'e çevirir.
 * Tam çözünürlüklü PNG base64 birkaç MB tuttuğu için localStorage kotasını (~5 MB) aşıp
 * uygulamayı çökertiyordu; WebP + yeniden boyutlandırma ile yüzlerce KB'a iner.
 */
async function blobToCompactDataUrl(blob: Blob, stripBlackEdges = true): Promise<string> {
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
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    if (stripBlackEdges) {
      cleanCornerBlackMatte(ctx, w, h, 16);
    }

    const webp = canvas.toDataURL('image/webp', 0.90);
    // Bazı tarayıcılar webp desteklemezse alfa koruyan PNG'ye düşer (asla JPEG değil!).
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

/**
 * Kenarlara bitişik düz siyah arka planı şeffaflaştırır ve saydam WebP/PNG döner.
 */
export async function stripBlackBackgroundFromDataUrl(imageSource: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imageSource;
  });

  const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || 500) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 500) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSource;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  cleanCornerBlackMatte(ctx, w, h, 26);

  const webp = canvas.toDataURL('image/webp', 0.9);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
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
    options?.onProgress?.('AI modeli yükleniyor', 5);
    const { removeBackground } = await import('@imgly/background-removal');
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
