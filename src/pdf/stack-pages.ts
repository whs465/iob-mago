import { PDFDocument, PageSizes } from 'pdf-lib';

export const STACK_SHEET_SIZE = PageSizes.A4;
type Size = { width: number; height: number };
export type StackRect = Size & { x: number; y: number };
type Pair<T> = readonly [T, T];

// Coordinates are measured from the top-left so the preview and PDF share a layout.
export function getStackLayout(sizes: Pair<Size>): [StackRect, StackRect] {
  const [width, height] = STACK_SHEET_SIZE;
  const margin = 28;
  const gap = 16;
  const scale = Math.min(
    1,
    (width - 2 * margin) / Math.max(...sizes.map(size => size.width)),
    (height - 2 * margin - gap) / (sizes[0].height + sizes[1].height),
  );
  const [first, second] = sizes.map(size => ({ width: size.width * scale, height: size.height * scale }));
  const top = (height - first.height - second.height - gap) / 2;
  return [
    { ...first, x: (width - first.width) / 2, y: top },
    { ...second, x: (width - second.width) / 2, y: top + first.height + gap },
  ];
}

export function getInkBounds({ data, width, height }: ImageData): StackRect {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (Math.min(data[offset], data[offset + 1], data[offset + 2]) >= 248) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = y;
    }
  }
  if (right < left) return { x: 0, y: 0, width, height };
  const padding = 10;
  const x = Math.max(0, left - padding);
  const y = Math.max(0, top - padding);
  return {
    x, y,
    width: Math.min(width, right + 1 + padding) - x,
    height: Math.min(height, bottom + 1 + padding) - y,
  };
}

export async function buildStackedPdf(images: Pair<{ png: ArrayBuffer; placement: StackRect }>) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(STACK_SHEET_SIZE);
  for (const { png, placement } of images) {
    page.drawImage(await pdf.embedPng(png), {
      ...placement,
      y: page.getHeight() - placement.y - placement.height,
    });
  }
  return pdf.save();
}
