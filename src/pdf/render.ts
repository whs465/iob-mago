export type PageMetrics = {
  index: number;
  width: number;
  height: number;
  rotation: number;
  isLandscape: boolean;
};

type PdfLibPage = {
  ref: unknown;
  node: unknown;
  getSize(): { width: number; height: number };
  getRotation(): { angle: number };
  setRotation(rotation: unknown): void;
  drawImage(
    image: EmbeddedPng,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ): void;
};

type PdfLibLoadedDocument = {
  catalog: {
    get?(name: unknown): unknown;
    set?(name: unknown, value: unknown): void;
  };
  context: {
    lookup(value: unknown): unknown;
    nextRef(): unknown;
    obj(value: unknown): unknown;
    assign(ref: unknown, value: unknown): void;
  };
  getPageCount(): number;
  getPages(): PdfLibPage[];
  getPage(index: number): PdfLibPage;
  getPageIndices(): number[];
  copyPages(sourcePdf: PdfLibLoadedDocument, indices: number[]): Promise<unknown[]>;
  addPage(pageOrSize: unknown): PdfLibDrawPage;
  embedPng(imageBytes: ArrayBuffer | string): Promise<EmbeddedPng>;
  embedJpg(imageBytes: ArrayBuffer): Promise<EmbeddedPng>;
  save(): Promise<Uint8Array>;
};

type EmbeddedPng = {
  width: number;
  height: number;
};

type PdfLibDrawPage = {
  drawImage(
    image: EmbeddedPng,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ): void;
};

export type PdfLibRenderableDocument = {
  embedPng(dataUrl: string): Promise<EmbeddedPng>;
  addPage(size: [number, number]): PdfLibDrawPage;
};

type PdfLibCreatedDocument = PdfLibRenderableDocument & {
  embedJpg(imageBytes: ArrayBuffer): Promise<EmbeddedPng>;
  save(options?: { useObjectStreams?: boolean }): Promise<Uint8Array>;
};

type PdfDocumentFactory = {
  create(): Promise<PdfLibCreatedDocument>;
  load(arrayBuffer: ArrayBuffer): Promise<PdfLibLoadedDocument>;
};

type PdfJsViewport = {
  width: number;
  height: number;
};

type PdfJsPage = {
  rotate?: number;
  getViewport(options: { scale: number; rotation?: number }): PdfJsViewport;
  render(context: Record<string, unknown>): { promise: Promise<void> };
};

type PdfJsDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
  destroy(): Promise<void>;
};

type PdfJsLib = {
  getDocument(options: { data: ArrayBuffer }): {
    promise: Promise<PdfJsDocument>;
  };
};

function canvasToJpegArrayBuffer(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Could not encode the rendered PDF page'));
        return;
      }
      blob.arrayBuffer().then(resolve, reject);
    }, 'image/jpeg', quality);
  });
}

export function normalizeRotationAngle(angle = 0) {
  const numericAngle = Number(angle) || 0;
  return ((numericAngle % 360) + 360) % 360;
}

export function getVisiblePageDimensions(width: number, height: number, rotation = 0) {
  return normalizeRotationAngle(rotation) % 180 === 0
    ? { width, height }
    : { width: height, height: width };
}

export function isLandscapePage(width: number, height: number, rotation = 0) {
  const visible = getVisiblePageDimensions(width, height, rotation);
  return visible.width > visible.height;
}

export function isEncryptedPdfError(error: unknown) {
  return /encrypted/i.test((error as { message?: string } | null)?.message || '');
}

function cloneArrayBuffer(arrayBuffer: ArrayBuffer) {
  return arrayBuffer.slice(0);
}

export function createPdfRenderRuntime({
  PDFDocument,
  pdfjsLib,
}: {
  PDFDocument: PdfDocumentFactory;
  pdfjsLib: PdfJsLib;
}) {
  function loadPdfDocument(arrayBuffer: ArrayBuffer) {
    return PDFDocument.load(arrayBuffer);
  }

  async function getPdfPageCountFromArrayBuffer(arrayBuffer: ArrayBuffer) {
    try {
      const pdf = await loadPdfDocument(arrayBuffer);
      return { pageCount: pdf.getPageCount(), rasterized: false };
    } catch (error) {
      if (!isEncryptedPdfError(error)) throw error;

      const loadingTask = pdfjsLib.getDocument({ data: cloneArrayBuffer(arrayBuffer) });
      const sourcePdf = await loadingTask.promise;

      try {
        return { pageCount: sourcePdf.numPages, rasterized: true };
      } finally {
        await sourcePdf.destroy();
      }
    }
  }

  async function getPdfPageMetricsFromArrayBuffer(arrayBuffer: ArrayBuffer) {
    try {
      const pdf = await loadPdfDocument(arrayBuffer);
      return {
        metrics: pdf.getPages().map((page, index): PageMetrics => {
          const { width, height } = page.getSize();
          const rotation = normalizeRotationAngle(page.getRotation().angle);
          const visible = getVisiblePageDimensions(width, height, rotation);
          return {
            index,
            width: visible.width,
            height: visible.height,
            rotation,
            isLandscape: visible.width > visible.height,
          };
        }),
        rasterized: false,
      };
    } catch (error) {
      if (!isEncryptedPdfError(error)) throw error;

      const loadingTask = pdfjsLib.getDocument({ data: cloneArrayBuffer(arrayBuffer) });
      const sourcePdf = await loadingTask.promise;

      try {
        const metrics: PageMetrics[] = [];
        for (let index = 0; index < sourcePdf.numPages; index++) {
          const page = await sourcePdf.getPage(index + 1);
          const viewport = page.getViewport({ scale: 1 });
          metrics.push({
            index,
            width: viewport.width,
            height: viewport.height,
            rotation: normalizeRotationAngle(page.rotate || 0),
            isLandscape: viewport.width > viewport.height,
          });
        }

        return { metrics, rasterized: true };
      } finally {
        await sourcePdf.destroy();
      }
    }
  }

  async function appendRenderedPdfPages(
    targetPdf: PdfLibRenderableDocument,
    arrayBuffer: ArrayBuffer,
    pageIndices: number[] | null = null,
  ) {
    const loadingTask = pdfjsLib.getDocument({ data: cloneArrayBuffer(arrayBuffer) });
    const sourcePdf = await loadingTask.promise;
    const indices = pageIndices || Array.from({ length: sourcePdf.numPages }, (_, index) => index);

    try {
      for (const pageIndex of indices) {
        const sourcePage = await sourcePdf.getPage(pageIndex + 1);
        const pdfViewport = sourcePage.getViewport({ scale: 1 });
        const renderViewport = sourcePage.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context unavailable');

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await sourcePage.render({
          canvasContext: context,
          viewport: renderViewport,
        }).promise;

        const image = await targetPdf.embedPng(canvas.toDataURL('image/png'));
        const page = targetPdf.addPage([pdfViewport.width, pdfViewport.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: pdfViewport.width,
          height: pdfViewport.height,
        });

        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      await sourcePdf.destroy();
    }

    return indices.length;
  }

  async function buildRotatedPortraitPdfFromRenderedPages(
    arrayBuffer: ArrayBuffer,
    selectedPageIndices: number[] | null = null,
    mode: 'auto' | 'left' | 'right' | 'half-turn' = 'auto',
  ) {
    const loadingTask = pdfjsLib.getDocument({ data: cloneArrayBuffer(arrayBuffer) });
    const sourcePdf = await loadingTask.promise;
    const targetPdf = await PDFDocument.create();
    const indices = selectedPageIndices || Array.from({ length: sourcePdf.numPages }, (_, index) => index);
    const selectedPages = new Set(indices);
    let rotatedCount = 0;

    try {
      for (let index = 0; index < sourcePdf.numPages; index++) {
        const sourcePage = await sourcePdf.getPage(index + 1);
        const baseViewport = sourcePage.getViewport({ scale: 1 });
        const shouldRotate = selectedPages.has(index)
          && (mode !== 'auto' || baseViewport.width > baseViewport.height);
        const rotationDelta = mode === 'left' ? -90 : mode === 'half-turn' ? 180 : 90;
        const targetRotation = normalizeRotationAngle(
          (sourcePage.rotate || 0) + (shouldRotate ? rotationDelta : 0),
        );
        const finalViewport = sourcePage.getViewport({ scale: 1, rotation: targetRotation });
        const renderViewport = sourcePage.getViewport({ scale: 2, rotation: targetRotation });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context unavailable');

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await sourcePage.render({
          canvasContext: context,
          viewport: renderViewport,
        }).promise;

        const image = await targetPdf.embedPng(canvas.toDataURL('image/png'));
        const page = targetPdf.addPage([finalViewport.width, finalViewport.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: finalViewport.width,
          height: finalViewport.height,
        });

        if (shouldRotate) rotatedCount++;

        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      await sourcePdf.destroy();
    }

    return {
      pdfBytes: await targetPdf.save(),
      rotatedCount,
    };
  }

  async function buildCompressedPdfFromRenderedPages(
    arrayBuffer: ArrayBuffer,
    {
      scale,
      quality,
      onProgress,
    }: {
      scale: number;
      quality: number;
      onProgress?: (completed: number, total: number) => void;
    },
  ) {
    const loadingTask = pdfjsLib.getDocument({ data: cloneArrayBuffer(arrayBuffer) });
    const sourcePdf = await loadingTask.promise;
    const targetPdf = await PDFDocument.create();

    try {
      for (let index = 0; index < sourcePdf.numPages; index++) {
        const sourcePage = await sourcePdf.getPage(index + 1);
        const pdfViewport = sourcePage.getViewport({ scale: 1 });
        const renderViewport = sourcePage.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context unavailable');

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await sourcePage.render({ canvasContext: context, viewport: renderViewport }).promise;
        const jpgBytes = await canvasToJpegArrayBuffer(canvas, quality);
        const image = await targetPdf.embedJpg(jpgBytes);
        const page = targetPdf.addPage([pdfViewport.width, pdfViewport.height]);
        page.drawImage(image, { x: 0, y: 0, width: pdfViewport.width, height: pdfViewport.height });

        canvas.width = 0;
        canvas.height = 0;
        onProgress?.(index + 1, sourcePdf.numPages);
      }
    } finally {
      await sourcePdf.destroy();
    }

    return targetPdf.save({ useObjectStreams: true });
  }

  return {
    loadPdfDocument,
    getPdfPageCountFromArrayBuffer,
    getPdfPageMetricsFromArrayBuffer,
    appendRenderedPdfPages,
    buildRotatedPortraitPdfFromRenderedPages,
    buildCompressedPdfFromRenderedPages,
  };
}
