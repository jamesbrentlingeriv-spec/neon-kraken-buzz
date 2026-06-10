import { showError } from "@/utils/toast";
import { countWords } from "./editor-utils";
import type { BaselineDocument } from "./types";
import { parseEpub, parsePdf } from "./document-parser";

/** Supported file extensions for baseline uploads */
export const ALL_SUPPORTED_EXTENSIONS = [".epub", ".pdf", ".txt"] as const;

/** Check if a file is supported (PDF or EPUB) */
export function isSupportedTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALL_SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** Helper to read a file as ArrayBuffer (needed for binary formats) */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Create a baseline document from any supported file */
export async function readFileAsBaseline(file: File): Promise<BaselineDocument> {
  const name = file.name;
  const extension = name.substring(name.lastIndexOf(".")).toLowerCase();

  let text = "";

  if (extension === ".epub") {
    text = await parseEpub(file);
  } else if (extension === ".pdf") {
    text = await parsePdf(file);
  } else if (extension === ".txt") {
    text = await readFileAsText(file);
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    source: file.type || "application/octet-stream",
    text,
    wordCount: countWords(text),
    createdAt: new Date().toISOString(),
  };
}

/** Read a plain text file to string */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Notify user when an unsupported file is selected */
export function notifyUnsupportedFiles(): void {
  showError("Supported files: .epub, .pdf, .txt");
}
