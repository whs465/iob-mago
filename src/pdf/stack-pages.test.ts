import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildStackedPdf, getInkBounds, getStackLayout, STACK_SHEET_SIZE } from './stack-pages';

describe('two pages on one sheet', () => {
  it('centers and fits both pages in order with a common scale', () => {
    const [first, second] = getStackLayout([{ width: 600, height: 800 }, { width: 800, height: 600 }]);
    expect(first.width / 600).toBeCloseTo(second.width / 800);
    expect(first.x * 2 + first.width).toBeCloseTo(STACK_SHEET_SIZE[0]);
    expect(first.y + first.height).toBeLessThan(second.y);
    expect(second.y + second.height).toBeLessThan(STACK_SHEET_SIZE[1]);
  });

  it('trims blank margins with padding and keeps an entirely blank page intact', () => {
    const width = 50;
    const height = 50;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const image = { data, width, height } as ImageData;
    expect(getInkBounds(image)).toEqual({ x: 0, y: 0, width: 50, height: 50 });
    data[(24 * width + 25) * 4] = 120;
    expect(getInkBounds(image)).toEqual({ x: 15, y: 14, width: 21, height: 21 });
  });

  it('writes a single portrait A4 page containing both positions', async () => {
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII='), char => char.charCodeAt(0)).buffer;
    const [first, second] = getStackLayout([{ width: 300, height: 100 }, { width: 200, height: 90 }]);
    const pdf = await PDFDocument.load(await buildStackedPdf([{ png, placement: first }, { png, placement: second }]));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: STACK_SHEET_SIZE[0], height: STACK_SHEET_SIZE[1] });
    const images = pdf.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
    expect(images?.keys()).toHaveLength(2);
  });
});
