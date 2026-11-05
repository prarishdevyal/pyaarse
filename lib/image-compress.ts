/** Longest edge kept. Product photos display at most ~800px wide, so this is 2x for sharp retina screens. */
export const MAX_EDGE = 2000;
/** WebP quality; 0.9 is visually indistinguishable from the original for photos. */
export const QUALITY = 0.9;
/** Files already this small and within MAX_EDGE are uploaded untouched (no re-encode, no generation loss). */
export const KEEP_BELOW_BYTES = 800 * 1024;
/** Vercel rejects request bodies over 4.5MB, so all images in one save must fit under this. */
export const UPLOAD_BUDGET_BYTES = 4 * 1024 * 1024;

export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function needsCompression(width: number, height: number, bytes: number) {
  return Math.max(width, height) > MAX_EDGE || bytes > KEEP_BELOW_BYTES;
}

/** Halving steps before the final resize; each step at most halves, which keeps downscaling sharp. */
export function downscaleSteps(width: number, height: number, target: { width: number; height: number }) {
  const steps: { width: number; height: number }[] = [];
  let w = width;
  let h = height;
  while (w / 2 > target.width) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    steps.push({ width: w, height: h });
  }
  steps.push(target);
  return steps;
}

export const totalBytes = (files: { size: number }[]) => files.reduce((n, f) => n + f.size, 0);

export function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Browser only: returns a smaller, upright copy of the image, or the original when that is already best. */
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (!needsCompression(bitmap.width, bitmap.height, file.size)) return file;
    let source: CanvasImageSource = bitmap;
    let canvas: HTMLCanvasElement | null = null;
    for (const step of downscaleSteps(bitmap.width, bitmap.height, fitWithin(bitmap.width, bitmap.height))) {
      canvas = document.createElement("canvas");
      canvas.width = step.width;
      canvas.height = step.height;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, step.width, step.height);
      source = canvas;
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, "image/webp", QUALITY));
    // Browsers without WebP encoding hand back PNG; keep the original rather than risk a bigger or worse file.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
