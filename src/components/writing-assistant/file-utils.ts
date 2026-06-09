import { showError } from "@/utils/toast";
import { SUPPORTED_BASELINE_EXTENSIONS, countWords } from "./editor-utils";
import type { BaselineDocument } from "./types";
import { parseEpub, parsePdf } from "./document-parser";

export const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_BASELINE_EXTENSIONS,
  ".epub",
  ".pdf",
] as const;

export function isSupportedTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALL_SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => {
      showError("Failed to read file. Please try another file.");
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileAsBaseline(file: File): Promise<BaselineDocument> {
  const name = file.name;
  const extension = name.substring(name.lastIndexOf(".")).toLowerCase();

  let text = "";

  if (extension === ".epub") {
    text = await parseEpub(file);
  } else if (extension === ".pdf") {
    text = await parsePdf(file);
  } else {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    text = new TextDecoder("utf-8").decode(arrayBuffer);
  }

  if (!text.trim()) {
    showError("Failed to extract text from file. Please try another file.");
    return {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      source: file.type || "application/octet-stream",
      text: "",
      wordCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    source: file.type || "application/octet-stream",
    text,
    wordCount: countWords(text),
    createdAt: new Date().toISOString(),
  };
}

export function createFileId(prefix = "file"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readFileAsText(file: File): Promise<BaselineDocument> {
  return readFileAsBaseline(file);
}

export function notifyUnsupportedFiles(): void {
  showError(
    "Supported files: .txt, .md, .markdown, .csv, .json, .epub, .pdf",
  );
}