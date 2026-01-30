"use client";

import { pdfjs } from "react-pdf";

// ✅ Configure worker ONCE, in a browser-only file
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  async function compressImage(
    dataUrl: string,
    quality = 0.8
  ): Promise<string> {
    const img = new Image();
    img.src = dataUrl;
  
    await new Promise<void>((res) => (img.onload = () => res()));
  
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = img.width;
    canvas.height = img.height;
  
    ctx.drawImage(img, 0, 0);
  
    const compressed = canvas.toDataURL("image/jpeg", quality);
  
    canvas.width = 0;
    canvas.height = 0;
  
    return compressed;
  }
export async function pdfToImages(
  buffer: ArrayBuffer
): Promise<string[]> {
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      }).promise;
      

    const png = canvas.toDataURL("image/png");
    const jpeg = await compressImage(png);

    images.push(jpeg);

    // cleanup
    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
}
