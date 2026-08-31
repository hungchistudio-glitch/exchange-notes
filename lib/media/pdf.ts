"use client";

/* =========================================================
   A page of a document, as pixels the pipeline already knows how to read

   The only genuinely new capability in this work — nothing here replaces an
   older path, because the app has never accepted a file that was not an
   image. What it deliberately does not do is become a PDF viewer: it renders
   one page, at a resolution chosen for reading rather than for looking at,
   and hands back the same Raster the camera produces. Everything after that
   — the target, the crop, the card, the storage — is the shared pipeline,
   unchanged and untouched.

   Nothing rendered here is ever stored. The spec is specific about that and
   it is the right instinct: a full-page render at reading resolution is
   several megabytes, and keeping one per saved word would mean a vocabulary
   card of a single dish costing more storage than the entire menu scan that
   found it. What gets kept is what gets kept for a photograph — a normalised
   source and a card crop — both of which are made from this and are far
   smaller than it.

   pdfjs-dist is a new dependency, and the only one added. There is no
   platform API that decodes PDF: Safari and Chrome both render them, neither
   exposes a way to draw one onto a canvas, and the alternative was a server
   round trip per page.
   ========================================================= */

import type { Raster } from "@/lib/media/raster";

/**
 * The long edge a page is rendered at.
 *
 * Matched to the menu reader's resolution rather than to the screen's,
 * because the thing that will read this is a model looking for small type.
 * A page rendered at preview size produces a card that looks fine and a
 * recognition that guesses.
 */
const PAGE_MAX_EDGE = 1800;

export class PdfRenderError extends Error {
  constructor(message = "This document could not be opened.") {
    super(message);
    this.name = "PdfRenderError";
  }
}

type PdfModule = typeof import("pdfjs-dist");

let modulePromise: Promise<PdfModule> | null = null;

/**
 * pdf.js, loaded the first time a document is actually opened.
 *
 * Deliberately dynamic. It is a large library, most sessions never open a
 * PDF, and the spec asks that heavy recognition components not be
 * initialised before they are needed — putting it in the camera screen's
 * bundle would slow down opening the camera for everyone in order to speed
 * up a file import for a few.
 */
async function loadPdfjs(): Promise<PdfModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const pdfjs = await import("pdfjs-dist");

      /*
       * The worker is what keeps parsing off the main thread, which for a
       * document of any size is the difference between a pause and a frozen
       * tab. Resolved through import.meta.url so the bundler emits it as an
       * asset rather than expecting it to be served from a CDN.
       */
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      return pdfjs;
    })();
  }

  return modulePromise;
}

export type PdfDocument = {
  pageCount: number;
  /** Renders one page, one-based, into a fresh Raster. */
  renderPage: (page: number) => Promise<Raster>;
  /** Releases the parsed document. Always call it. */
  close: () => void;
};

/**
 * A PDF opened and ready to render pages from.
 *
 * The document is parsed once and held; pages are rendered on demand, so
 * stepping through a five-page menu costs five renders rather than five
 * parses. The caller owns the lifetime and must close it.
 */
export async function openPdf(file: Blob): Promise<PdfDocument> {
  const pdfjs = await loadPdfjs();

  /*
   * The loading task is kept, not just the document: destroy() lives on the
   * task, and it is what tears down the worker. Dropping the task and
   * keeping only the document leaks a worker thread per file opened.
   */
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    /*
     * Fonts come from the file or not at all. The default fetches standard
     * font data from a CDN, which this app's content security policy
     * forbids and which would leak that a document was opened.
     */
    useSystemFonts: false,
  });

  let document_;

  try {
    document_ = await task.promise;
  } catch (openError) {
    console.error("Could not open that document:", openError);
    void task.destroy();
    throw new PdfRenderError();
  }

  return {
    pageCount: document_.numPages,

    async renderPage(pageNumber: number): Promise<Raster> {
      const clamped = Math.min(
        document_.numPages,
        Math.max(1, Math.round(pageNumber)),
      );

      try {
        const page = await document_.getPage(clamped);

        /*
         * Scaled so the long edge lands on PAGE_MAX_EDGE, rather than
         * rendered at a fixed zoom: an A4 menu and a till receipt should
         * reach the model with comparable detail, and their natural sizes
         * differ by a factor of four.
         */
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: PAGE_MAX_EDGE / Math.max(natural.width, natural.height),
        });

        const canvas = window.document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));

        const context = canvas.getContext("2d");

        if (!context) throw new PdfRenderError();

        /*
         * White behind the page. A PDF page is transparent where nothing is
         * drawn, and a transparent canvas encoded as WebP or JPEG comes out
         * black — which reads as a scanning failure rather than as a page.
         */
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvas, canvasContext: context, viewport })
          .promise;

        page.cleanup();

        return {
          source: canvas,
          width: canvas.width,
          height: canvas.height,
          close: () => {
            canvas.width = 0;
            canvas.height = 0;
          },
        };
      } catch (renderError) {
        console.error("Could not render that page:", renderError);
        throw new PdfRenderError();
      }
    },

    close() {
      void task.destroy();
    },
  };
}

/** Whether this file is one this module can open. */
export function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}
