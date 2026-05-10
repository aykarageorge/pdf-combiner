import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import type { FileItem, Page } from '@/types';

// Configure pdf.js worker
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const THUMBNAIL_MAX_WIDTH = 200;
const PDF_TARGET_WIDTH = 595; // A4 width in points

function createThumbnail(
  source: HTMLCanvasElement | HTMLImageElement,
  width: number,
  height: number
): string {
  const scale = THUMBNAIL_MAX_WIDTH / width;
  const thumbWidth = Math.round(width * scale);
  const thumbHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = thumbWidth;
  canvas.height = thumbHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, thumbWidth, thumbHeight);
  return canvas.toDataURL('image/png');
}

async function processImage(file: File): Promise<FileItem[]> {
  const arrayBuffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const thumbnail = createThumbnail(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(img.src);

      resolve([
        {
          id: crypto.randomUUID(),
          name: file.name,
          type: 'image',
          thumbnail,
          data: arrayBuffer,
          width: img.naturalWidth,
          height: img.naturalHeight,
        },
      ]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = URL.createObjectURL(file);
  });
}

async function processPdf(file: File): Promise<FileItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const items: FileItem[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    // Render page to canvas for thumbnail
    const scale = THUMBNAIL_MAX_WIDTH / viewport.width;
    const thumbViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(thumbViewport.width);
    canvas.height = Math.round(thumbViewport.height);
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvas, canvasContext: ctx, viewport: thumbViewport }).promise;

    const thumbnail = canvas.toDataURL('image/png');

    items.push({
      id: crypto.randomUUID(),
      name: pdf.numPages > 1 ? `${file.name} (p${i})` : file.name,
      type: 'pdf-page',
      thumbnail,
      data: arrayBuffer,
      width: viewport.width,
      height: viewport.height,
      pageNumber: i,
      sourceFile: file.name,
    });
  }

  return items;
}

export async function processFile(file: File): Promise<FileItem[]> {
  const type = file.type;

  if (type === 'application/pdf') {
    return processPdf(file);
  }

  if (type === 'image/png' || type === 'image/jpeg') {
    return processImage(file);
  }

  throw new Error(`Unsupported file type: ${type || file.name}`);
}

export async function combineToPdf(pages: Page[]): Promise<Uint8Array> {
  const outputPdf = await PDFDocument.create();

  for (const pageGroup of pages) {
    const items = pageGroup.items;
    if (items.length === 0) continue;

    // Calculate total height: scale each item to PDF_TARGET_WIDTH
    let totalHeight = 0;
    const scaledDimensions: { width: number; height: number }[] = [];

    for (const item of items) {
      const scale = PDF_TARGET_WIDTH / item.width;
      const scaledHeight = item.height * scale;
      scaledDimensions.push({ width: PDF_TARGET_WIDTH, height: scaledHeight });
      totalHeight += scaledHeight;
    }

    // Create a page for this group
    const page = outputPdf.addPage([PDF_TARGET_WIDTH, totalHeight]);

    // Draw items from top to bottom (PDF coordinate system has origin at bottom-left)
    let yOffset = totalHeight;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const dims = scaledDimensions[i];
      yOffset -= dims.height;

      if (item.type === 'image') {
        const imageData = item.data.slice(0);
        let embedded;

        // Detect format from the actual data bytes
        const bytes = new Uint8Array(imageData);
        if (bytes[0] === 0x89 && bytes[1] === 0x50) {
          embedded = await outputPdf.embedPng(imageData);
        } else {
          embedded = await outputPdf.embedJpg(imageData);
        }

        page.drawImage(embedded, {
          x: 0,
          y: yOffset,
          width: dims.width,
          height: dims.height,
        });
      } else if (item.type === 'pdf-page') {
        const pageIndex = (item.pageNumber ?? 1) - 1;
        const srcDoc = await PDFDocument.load(item.data.slice(0));
        const [embeddedPage] = await outputPdf.embedPdf(srcDoc, [pageIndex]);

        page.drawPage(embeddedPage, {
          x: 0,
          y: yOffset,
          width: dims.width,
          height: dims.height,
        });
      }
    }
  }

  return outputPdf.save();
}
