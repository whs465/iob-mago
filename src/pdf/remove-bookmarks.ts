import { PDFDict, PDFDocument, PDFName, PDFRef, type PDFObject } from 'pdf-lib';

const outlines = PDFName.of('Outlines');
const pageMode = PDFName.of('PageMode');
const first = PDFName.of('First');
const next = PDFName.of('Next');
const title = PDFName.of('Title');

export async function removePdfBookmarks(bytes: ArrayBuffer): Promise<Uint8Array | null> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const root = pdf.catalog.get(outlines);
  if (!root) return null;

  pdf.catalog.delete(outlines);
  if (pdf.catalog.get(pageMode) === PDFName.of('UseOutlines')) pdf.catalog.delete(pageMode);

  const pending: Array<{ object: PDFObject; isRoot: boolean }> = [{ object: root, isRoot: true }];
  const visited = new Set<PDFDict>();
  while (pending.length) {
    const { object, isRoot } = pending.pop()!;
    const dict = pdf.context.lookup(object);
    if (!(dict instanceof PDFDict) || visited.has(dict) || (!isRoot && !dict.has(title))) continue;
    visited.add(dict);
    const child = dict.get(first);
    const sibling = isRoot ? undefined : dict.get(next);
    if (child) pending.push({ object: child, isRoot: false });
    if (sibling) pending.push({ object: sibling, isRoot: false });
    if (object instanceof PDFRef) pdf.context.delete(object);
  }

  return pdf.save({ useObjectStreams: true });
}
