import type { ModelImage } from "./gemini";

/* ────────────────────────────────────────────────────────────────────────────
 * Image loading for the model. Supports the three path kinds the app stores:
 * static demo files (/demo/*.jpg), Supabase storage URLs, and data URLs.
 * Returns null when an image cannot be loaded — the analysis proceeds
 * text-only and says so.
 * ──────────────────────────────────────────────────────────────────────────── */

const MAX_IMAGES = 3;
const MAX_BYTES = 6 * 1024 * 1024;

export async function loadImages(paths: string[]): Promise<{
  images: ModelImage[];
  failures: string[];
}> {
  const limited = paths.slice(0, MAX_IMAGES);
  const results = await Promise.all(
    limited.map(async (p) => {
      try {
        return await loadOne(p);
      } catch (error) {
        console.warn(`[QuoteReady] image load failed for ${p}:`, (error as Error).message);
        return null;
      }
    }),
  );
  const images: ModelImage[] = [];
  const failures: string[] = [];
  for (const [i, r] of results.entries()) {
    if (r) images.push(r);
    else failures.push(limited[i]);
  }
  return { images, failures };
}

async function loadOne(path: string): Promise<ModelImage> {
  if (path.startsWith("data:")) {
    const match = path.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("malformed data URL");
    return { mimeType: match[1], base64: match[2] };
  }

  let buffer: Buffer;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const res = await fetch(path, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    // static asset under /public
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const rel = path.replace(/^\/+/, "");
    // In dev this is <root>/public/...; in a standalone build public/ sits next to the server.
    const candidates = [
      join(process.cwd(), "public", rel),
      join(process.cwd(), rel),
    ];
    for (const candidate of candidates) {
      try {
        buffer = await readFile(candidate);
        break;
      } catch {
        continue;
      }
    }
    if (!buffer!) throw new Error("file not found");
  }

  if (buffer.length > MAX_BYTES) throw new Error("image too large");
  return { mimeType: sniffMime(buffer, path), base64: buffer.toString("base64") };
}

function sniffMime(buffer: Buffer, path: string): string {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.length > 8 && buffer.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (buffer.length > 2 && buffer.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buffer.length > 12 && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      throw new Error("unsupported image type");
  }
}
