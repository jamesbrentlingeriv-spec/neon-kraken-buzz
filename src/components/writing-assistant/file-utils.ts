import { showError } from "@/utils/toast";
import {
  SUPPORTED_BASELINE_EXTENSIONS,
  countWords,
} from "./editor-utils";
import type { BaselineDocument } from "./types";

export function isSupportedTextFile(file: File): boolean {
  return SUPPORTED_BASELINE_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );
}

export function createFileId(prefix = "file"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readFileAsText(file: File): Promise<BaselineDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || "");

      resolve({
        id: createFileId("baseline"),
        name: file.name,
        source: file.type || "text/plain",
        text,
        wordCount: countWords(text),
        createdAt: new Date().toISOString(),
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function notifyUnsupportedFiles(): void {
  showError("Upload .txt, .md, .csv, or .json files for baseline context.");
}