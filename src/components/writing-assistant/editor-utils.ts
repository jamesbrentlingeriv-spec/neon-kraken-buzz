export const STORAGE_KEYS = {
  document: "ai-writing-assistant-document-html-v1",
  documentTitle: "ai-writing-assistant-document-title-v1",
  baselines: "ai-writing-assistant-baselines-v1",
} as const;

export const SUPPORTED_BASELINE_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
] as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function htmlToText(html: string): string {
  if (typeof document !== "undefined") {
    const element = document.createElement("div");
    element.innerHTML = html;
    return element.textContent?.replace(/\s+/g, " ").trim() || "";
  }

  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function textToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        return "";
      }

      return `<p>${lines.map(escapeHtml).join("<br />")}</p>`;
    })
    .join("");
}

export function countWords(text: string): number {
  const words = text.trim().match(/\b[\w’'-]+\b/g);
  return words ? words.length : 0;
}

export function readingTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 225));
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-document";
}

export function excerpt(value: string, maxLength = 180): string {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}