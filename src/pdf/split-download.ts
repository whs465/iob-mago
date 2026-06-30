import type { SplitPdfResult } from './operations';
import { getPdfBaseName } from '../utils/filenames';
import { pdfBytesToBlob } from '../utils/pdf-bytes';

export type SplitDownloadDeps = {
  JSZipCtor: new () => {
    file(name: string, data: Uint8Array | ArrayBuffer | Blob): unknown;
    generateAsync(options: { type: 'blob' }): Promise<Blob>;
  };
  saveAs(data: Blob, filename: string): void;
  delay?(milliseconds: number): Promise<void>;
};

export type SplitDownloadOptions = SplitDownloadDeps & {
  asZip: boolean;
  sourceFilename: string;
  zipSuffix: string;
  pagePrefix: string;
};

const defaultDelay = (milliseconds: number) => new Promise<void>(resolve => {
  setTimeout(resolve, milliseconds);
});

export async function downloadSplitPdfResult(result: SplitPdfResult, options: SplitDownloadOptions) {
  if (options.asZip) {
    const zip = new options.JSZipCtor();

    for (const page of result.pages) {
      zip.file(page.filename, page.pdfBytes);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    options.saveAs(content, `${getPdfBaseName(options.sourceFilename)}${options.zipSuffix}`);
    return;
  }

  const delay = options.delay ?? defaultDelay;
  for (const [index, page] of result.pages.entries()) {
    options.saveAs(
      pdfBytesToBlob(page.pdfBytes),
      `${options.pagePrefix}-${String(index + 1).padStart(3, '0')}.pdf`,
    );
    await delay(100);
  }
}
