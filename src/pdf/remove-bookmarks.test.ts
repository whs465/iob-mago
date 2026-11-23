import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { removePdfBookmarks } from './remove-bookmarks';

describe('remove PDF bookmarks', () => {
  it('removes the outline tree while preserving pages and metadata', async () => {
    const source = await PDFDocument.create();
    const page = source.addPage([600, 800]);
    source.setTitle('Informe');
    source.setAuthor('Equipo');
    const { context } = source;
    const root = context.nextRef();
    const parent = context.nextRef();
    const child = context.register(context.obj({
      Title: PDFString.of('Nested bookmark'), Parent: parent, Dest: [page.ref, 'Fit'],
    }));
    const sibling = context.register(context.obj({
      Title: PDFString.of('Sibling bookmark'), Parent: root, Dest: [page.ref, 'Fit'],
    }));
    context.assign(parent, context.obj({
      Title: PDFString.of('First bookmark'), Parent: root, First: child, Next: sibling,
    }));
    context.assign(root, context.obj({ Type: 'Outlines', First: parent, Last: sibling }));
    source.catalog.set(PDFName.of('Outlines'), root);
    source.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));

    const bytes = await removePdfBookmarks(Uint8Array.from(await source.save()).buffer);
    expect(bytes).not.toBeNull();
    const result = await PDFDocument.load(bytes!, { updateMetadata: false });
    expect(result.catalog.has(PDFName.of('Outlines'))).toBe(false);
    expect(result.catalog.has(PDFName.of('PageMode'))).toBe(false);
    for (const ref of [root, parent, child, sibling]) expect(result.context.lookup(ref)).toBeUndefined();
    expect(result.getPage(0).getSize()).toEqual({ width: 600, height: 800 });
    expect(result.getTitle()).toBe('Informe');
    expect(result.getAuthor()).toBe('Equipo');
  });

  it('returns no replacement when there are no bookmarks', async () => {
    const source = await PDFDocument.create();
    source.addPage();
    expect(await removePdfBookmarks(Uint8Array.from(await source.save()).buffer)).toBeNull();
  });
});
