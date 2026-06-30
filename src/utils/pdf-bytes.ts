export type PdfBytes = ArrayBuffer | Uint8Array;

export function pdfBytesToBlob(pdfBytes: PdfBytes) {
  const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  return new Blob([copy.buffer], { type: 'application/pdf' });
}
