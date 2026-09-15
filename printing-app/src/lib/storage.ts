import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Kept outside `src/` and `.next/` so it survives rebuilds/deploys.
// Override with UPLOAD_DIR in .env if you want it somewhere else (e.g. a
// separate mounted disk on your VPS).
const DATA_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "data", "uploads");

export const ACCEPTED_MIME_TYPES: Record<string, "pdf" | "image"> = {
  "application/pdf": "pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // 30MB

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

export function generateStoredName(mimeType: string): string {
  return `${crypto.randomUUID()}${extensionFor(mimeType)}`;
}

function resolveUploadPath(storedName: string): string {
  // storedName is always our own crypto.randomUUID() output, but guard
  // against path traversal regardless in case that ever changes.
  const safeName = path.basename(storedName);
  return path.join(DATA_DIR, safeName);
}

export async function saveUpload(storedName: string, buffer: Buffer): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(resolveUploadPath(storedName), buffer);
}

export async function readUpload(storedName: string): Promise<Buffer> {
  return fs.readFile(resolveUploadPath(storedName));
}

export async function deleteUpload(storedName: string): Promise<void> {
  try {
    await fs.unlink(resolveUploadPath(storedName));
  } catch {
    // already gone — fine.
  }
}
