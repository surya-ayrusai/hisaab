/**
 * Payment screenshot handling. Files are untrusted: the type and size are
 * checked, the image must actually decode, and it is re-encoded after
 * downscaling (which also drops embedded metadata).
 */

export const SHOT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SHOT_MAX_BYTES = 5 * 1024 * 1024;
export const SHOT_MAX_SIDE = 1600;

export type ShotResult =
  | { ok: true; blob: Blob; mimeType: string }
  | { ok: false; error: string };

export function checkShotFile(file: { type: string; size: number }): string | null {
  if (!SHOT_TYPES.includes(file.type)) return "Please choose a photo (JPG, PNG or WebP).";
  if (file.size === 0) return "This file is empty.";
  if (file.size > SHOT_MAX_BYTES) return "This photo is larger than 5 MB. Please choose a smaller one.";
  return null;
}

export async function prepareShot(file: File): Promise<ShotResult> {
  const problem = checkShotFile(file);
  if (problem) return { ok: false, error: problem };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: "This photo could not be read. Please choose another one." };
  }
  try {
    const scale = Math.min(1, SHOT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "This photo could not be read. Please choose another one." };
    ctx.drawImage(bitmap, 0, 0, width, height);
    const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.85));
    if (!blob) return { ok: false, error: "This photo could not be read. Please choose another one." };
    return { ok: true, blob, mimeType };
  } finally {
    bitmap.close();
  }
}
