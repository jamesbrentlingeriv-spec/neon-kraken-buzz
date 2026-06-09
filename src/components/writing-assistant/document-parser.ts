import { PDFDocumentProxy, getDocument } from "pdfjs-dist";
import { Book } from "epubjs";
import { readFileAsArrayBuffer } from "./file-utils";

/**
 * Extract plain text from an EPUB file.
 * Returns a single string with all chapter text concatenated.
 */
export async function parseEpub(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const book = new Book(arrayBuffer);
  await book.loaded.navigation; // ensure spine is ready

  const chapters = await Promise.all(
    book.spine.spineItems.map(async (item) => {
      const text = await item.render();
      // Strip HTML tags – keep only readable text
      const div = document.createElement("div");
      div.innerHTML = text;
      return div.textContent?.trim() ?? "";
    })
  );

  return chapters.filter(Boolean).join("\n\n");
}

/**
 * Extract plain text from a PDF file.
 * Returns a single string with all page text concatenated.
 */
export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf: PDFDocumentProxy = await getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => (item.str ? item.str : ""));
    pageTexts.push(strings.join(" "));
  }

  return pageTexts.join("\n\n");
}