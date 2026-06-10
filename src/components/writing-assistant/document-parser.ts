import { PDFDocumentProxy, getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { Book } from "epubjs";
import { readFileAsArrayBuffer } from "./file-utils";

/* -------------------------------------------------------------------------- */
/*  PDF.js – always set the worker (works in dev and production)             */
/* -------------------------------------------------------------------------- */
try {
  // The worker file is shipped inside pdfjs-dist; using new URL works for Vite.
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url,
  ).toString();
} catch (e) {
  // If something goes wrong we still continue; PDF parsing will throw later.
  console.error("Failed to set PDF worker:", e);
}

/* -------------------------------------------------------------------------- */
/*  EPUB parsing – use a Blob URL so epubjs can load the file correctly       */
/* -------------------------------------------------------------------------- */
export async function parseEpub(file: File): Promise<string> {
  // Create a temporary URL that epubjs can read.
  const blobUrl = URL.createObjectURL(file);

  try {
    const book = new Book(blobUrl);

    // Wait for the navigation (spine) to be ready.
    await book.loaded.navigation;

    // Ensure the spine items are loaded.
    await book.loaded.spine;

    const chapters = await Promise.all(
      book.spine.spineItems.map(async (item) => {
        // Render returns HTML for the chapter.
        const html = await item.render();

        // Strip HTML tags – keep only readable text.
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.textContent?.trim() ?? "";
      }),
    );

    // Join all non‑empty chapters.
    return chapters.filter(Boolean).join("\n\n");
  } catch (err) {
    console.error("EPUB parsing error:", err);
    return "";
  } finally {
    // Clean up the temporary URL.
    URL.revokeObjectURL(blobUrl);
  }
}

/* -------------------------------------------------------------------------- */
/*  PDF parsing – unchanged logic, now works because the worker is always set */
/* -------------------------------------------------------------------------- */
export async function parsePdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf: PDFDocumentProxy = await getDocument({ data: arrayBuffer }).promise;

    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = (content.items as any[])
        .map((item) => (item.str ? item.str : ""))
        .join(" ");
      pageTexts.push(strings);
    }

    return pageTexts.join("\n\n");
  } catch (err) {
    console.error("PDF parsing error:", err);
    return "";
  }
}