import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB, kept in sync with next.config.ts bodySizeLimit
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
}

export type UploadResult = { ok: true; url: string; fileName: string } | { ok: false; error: string };

export async function saveUploadedFile(file: File, subdir: string): Promise<UploadResult> {
  if (file.size === 0) return { ok: false, error: "The selected file is empty." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "Files must be 10MB or smaller." };
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Allowed file types: PDF, PNG, JPG, DOC, DOCX." };
  }

  const safeSubdir = subdir.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(UPLOAD_ROOT, safeSubdir);
  await mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const filePath = path.join(dir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return { ok: true, url: `/uploads/${safeSubdir}/${fileName}`, fileName: file.name };
}

export async function removeUploadedFile(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch {
    // Already gone — nothing to clean up.
  }
}
