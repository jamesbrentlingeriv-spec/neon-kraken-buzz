import { PDFDocumentProxy, getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { Book } from "epubjs";
import { readFileAsArrayBuffer } from "./file-utils";

/* -------------------------------------------------------------------------- */
/*  PDF.js – set the worker (required for Vite)                               */
/* -------------------------------------------------------------------------- */
if (import.meta.env.DEV) {
  // In development Vite serves the worker from the pdfjs-dist package
  // The exact path works for both dev and build modes.
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url,
  ).toString();
}

/* -------------------------------------------------------------------------- */
/*  EPUB parsing – create a Blob URL so epubjs can load the file correctly    */
/* -------------------------------------------------------------------------- */
export async function parseEpub(file: File): Promise<string> {
  // epubjs can read a Blob URL directly; we don’t need to convert to ArrayBuffer.
  const blobUrl = URL.createObjectURL(file);
  const book = new Book(blobUrl);
  await book.loaded.navigation; // ensure spine is ready

  const chapters = await Promise.all(
    book.spine.spineItems.map(async (item) => {
      const text = await item.render();
      // Strip HTML tags – keep only readable text
      const div = document.createElement("div");
      div.innerHTML = text;
      return div.textContent?.trim() ?? "";
    }),
  );

  // Clean up the temporary URL
  URL.revokeObjectURL(blobUrl);

  return chapters.filter(Boolean).join("\n\n");
}

/* -------------------------------------------------------------------------- */
/*  PDF parsing – unchanged logic, now works because the worker is set up      */
/* -------------------------------------------------------------------------- */
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