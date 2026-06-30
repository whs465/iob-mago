import type { SignaturePdfDocProxy } from '../state/signature-viewer';

export type SignaturePdfLoaderDeps = {
  getDocument(options: { data: ArrayBuffer }): {
    promise: Promise<SignaturePdfDocProxy>;
  };
};

export type LoadedSignaturePdf = {
  file: File;
  pdfDocProxy: SignaturePdfDocProxy;
  totalPages: number;
};

export async function loadSignaturePdfDocument(
  file: File,
  deps: SignaturePdfLoaderDeps,
): Promise<LoadedSignaturePdf> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = deps.getDocument({ data: arrayBuffer });
  const pdfDocProxy = await loadingTask.promise;

  return {
    file,
    pdfDocProxy,
    totalPages: pdfDocProxy.numPages,
  };
}
