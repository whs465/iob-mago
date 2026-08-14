import { pdfBytesToBlob } from './pdf-bytes';

export type PdfBatchZipConstructor = new () => {
  file(name: string, data: Uint8Array | ArrayBuffer | Blob): unknown;
  generateAsync(options: { type: 'blob' }): Promise<Blob>;
};

export type PdfBatchOutput = {
  filename: string;
  pdfBytes: Uint8Array;
};

export async function downloadPdfOutputs(
  outputs: PdfBatchOutput[],
  options: {
    zipFilename: string;
    JSZipCtor?: PdfBatchZipConstructor;
    saveAs(blob: Blob, filename: string): void;
  },
) {
  if (outputs.length === 0) return;
  if (outputs.length === 1) {
    options.saveAs(pdfBytesToBlob(outputs[0].pdfBytes), outputs[0].filename);
    return;
  }
  if (!options.JSZipCtor) throw new Error('ZIP support is required for batch downloads');

  const zip = new options.JSZipCtor();
  outputs.forEach(output => zip.file(output.filename, output.pdfBytes));
  options.saveAs(await zip.generateAsync({ type: 'blob' }), options.zipFilename);
}
