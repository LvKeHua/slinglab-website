/**
 * Chart screenshot uploads — Mazino-style trade screenshots stored on local
 * disk under server/data/uploads. Base64 payloads only (the frontend reads
 * the file client-side and posts the data URL).
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { randomBytes } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = process.env.STONE_UPLOAD_DIR ?? join(__dirname, "..", "..", "data", "uploads");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image
const ALLOWED_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export interface UploadResult {
  id: string;
  url: string;
  size: number;
}

/** Persist a base64 data URL; returns the served path. */
export function saveUpload(dataUrl: string): UploadResult {
  const match = /^data:(image\/[a-z+]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("expected a base64 data URL");
  const mime = match[1];
  const ext = ALLOWED_EXT[mime];
  if (!ext) throw new Error(`unsupported image type: ${mime}`);
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) throw new Error("empty image");
  if (buffer.length > MAX_BYTES) throw new Error("image exceeds 5 MB limit");

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const id = randomBytes(8).toString("hex");
  const file = `${id}${ext}`;
  writeFileSync(join(UPLOAD_DIR, file), buffer);
  return { id, url: `/api/uploads/${file}`, size: buffer.length };
}

/** Read a stored upload back (for the GET route). */
export function readUpload(file: string): { data: Buffer; mime: string } | null {
  const safe = basename(file);
  if (safe !== file) return null; // no path traversal
  const path = join(UPLOAD_DIR, safe);
  if (!existsSync(path)) return null;
  const ext = extname(safe).toLowerCase();
  const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" }[ext];
  if (!mime) return null;
  return { data: readFileSync(path), mime };
}

/** List stored uploads (for cleanup/debug). */
export function listUploads(): Array<{ file: string; size: number }> {
  if (!existsSync(UPLOAD_DIR)) return [];
  return readdirSync(UPLOAD_DIR)
    .filter((f) => /^[a-f0-9]{16}\.(png|jpg|jpeg|webp|gif)$/.test(f))
    .map((f) => ({ file: f, size: statSync(join(UPLOAD_DIR, f)).size }));
}
