import { showError } from "@/utils/toast";
import {
  SUPPORTED_BASELINE_EXTENSIONS,
  countWords,
} from "./editor-utils";
import type { BaselineDocument } from "./types";
import { parseEpub, parsePdf } from "./document-parser";

/** Existing supported extensions plus EPUB & PDF */
export const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_BASELINE_EXTENSIONS,
  ".epub",
  ".pdf",
  ".docx",
] as const;

/** Check if a file is supported (text, EPUB, PDF, or DOCX) */
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
  } else if (extension === ".docx") {
    text = await parseDocx(file);
  } else {
    // plain-text fallback (already used elsewhere)
    const arrayBuffer = await readFileAsArrayBuffer(file);
    text = new TextDecoder("utf-8").decode(arrayBuffer);
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

/** Parse DOCX files by converting to text */
async function parseDocx(file: File): Promise<string> {
  // For DOCX, we'll use a simple approach:
  // DOCX is a ZIP file containing XML, we extract the document.xml
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Get the document.xml file
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) {
    throw new Error("Could not find document.xml in DOCX file");
  }
  
  const content = await documentXml.async("string");
  
  // Strip XML tags and get text content
  // This is a simplified approach - for production, use a proper DOCX parser
  const text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  return text;
}

// Import JSZip for DOCX parsing
import JSZip from "jszip";

/** Existing helper – kept for backward compatibility */
export function createFileId(prefix = "file"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Existing readFileAsText – now just a thin wrapper around readFileAsBaseline for .txt/.md etc. */
export function readFileAsText(file: File): Promise<BaselineDocument> {
  return readFileAsBaseline(file);
}

/** Notify user when an unsupported file is selected */
export function notifyUnsupportedFiles(): void {
  showError(
    "Supported files: .txt, .md, .markdown, .csv, .json, .epub, .pdf, .docx"
  );
}