import { PDFDocument, PDFHexString, PDFName, degrees } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { extractPdfBookmarks, writeFlatBookmarks } from './bookmarks';
import { adjustPagePixels, enhancePdfPages, NEUTRAL_PAGE_TONE } from './enhance-pages';

describe('enhance pages', () => {
  it('darkens faint ink while keeping white paper white', () => {
    const pixels = new Uint8ClampedArray([205, 205, 205, 255, 255, 255, 255, 255]);
    const output = new Uint8ClampedArray(pixels.length);
    adjustPagePixels(pixels, output, NEUTRAL_PAGE_TONE);
    expect(output).toEqual(pixels);
    adjustPagePixels(pixels, output, { contrast: 200, brightness: 0 });
    expect([...output]).toEqual([155, 155, 155, 255, 255, 255, 255, 255]);
  });

  it('replaces only the adjusted page content and preserves its reference and bookmark', async () => {
    const pdf = await PDFDocument.create();
    const first = pdf.addPage([300, 500]);
    const second = pdf.addPage([400, 600]);
    first.drawText('Editable original');
    second.drawText('Low contrast');
    second.setCropBox(10, 20, 300, 500);
    second.setRotation(degrees(90));
    pdf.setTitle('Mixed document');
    const bookmarkDeps = { PDFHexString, PDFName };
    writeFlatBookmarks(pdf, [{ title: 'Second page', pageIndex: 1 }], bookmarkDeps);
    const source = Uint8Array.from(await pdf.save()).buffer;
    const contents = PDFName.of('Contents');
    const firstContents = String(first.node.get(contents));
    const secondContents = String(second.node.get(contents));
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII='), char => char.charCodeAt(0)).buffer;
    const render = vi.fn(async () => ({ png, view: [10, 20, 310, 520] }));

    const output = await PDFDocument.load(await enhancePdfPages(source, new Map([[2, { contrast: 150, brightness: 0 }]]), render));
    expect(render).toHaveBeenCalledExactlyOnceWith(2, { contrast: 150, brightness: 0 });
    expect(output.getPages().map(page => String(page.ref))).toEqual([String(first.ref), String(second.ref)]);
    expect(String(output.getPage(0).node.get(contents))).toBe(firstContents);
    expect(String(output.getPage(1).node.get(contents))).not.toBe(secondContents);
    expect(output.getPage(1).getRotation().angle).toBe(90);
    expect(output.getPage(1).getCropBox()).toEqual({ x: 10, y: 20, width: 300, height: 500 });
    expect(output.getTitle()).toBe('Mixed document');
    expect(extractPdfBookmarks(output, bookmarkDeps)).toMatchObject([{ title: 'Second page', pageIndex: 1 }]);
  });
});
