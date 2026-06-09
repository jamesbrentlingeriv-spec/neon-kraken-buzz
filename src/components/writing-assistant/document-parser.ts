import { readFileAsArrayBuffer } from "./file-utils";

function htmlToText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent?.replace(/\s+/g, " ").trim() || "";
}

/**
 * Extract plain text from an EPUB file.
 * Returns a single string with all chapter text concatenated.
 */
export async function parseEpub(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const epubModule = await import("epubjs");
  const createBook = (epubModule.default || epubModule) as (
    data: ArrayBuffer,
  ) => any;
  const book = createBook(arrayBuffer);

  await book.ready;

  const chapters = await Promise.all(
    book.spine.spineItems.map(async (item: any) => {
      const href = item.href || "";

      if (!/\.(xhtml|html|htm)$/i.test(href)) {
        return "";
      }

      const html = await item.load(book.load.bind(book));
      return htmlToText(String(html || ""));
    }),
  );

  book.destroy?.();

  return chapters.filter(Boolean).join("\n\n");
}

/**
 * Extract plain text from a PDF file.
 * Returns a single string with all page text concatenated.
 */
export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) =>
      "str" in item ? String(item.str || "") : "",
    );

    pageTexts.push(strings.join(" "));
  }

  return pageTexts.join("\n\n");
}