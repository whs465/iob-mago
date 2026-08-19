export type PdfTextAnchor = {
  x: number;
  y: number;
};

export type PdfTextPageSize = {
  width: number;
  height: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getPdfTextDrawPosition(
  anchor: PdfTextAnchor,
  page: PdfTextPageSize,
  textHeight: number,
) {
  const safeTextHeight = Math.max(0, textHeight);
  const top = clamp(anchor.y, 0, page.height);
  return {
    // The click marks the beginning of the text. Do not shift it left based on
    // text width; clipping at the right edge is more predictable than moving it.
    x: clamp(anchor.x, 0, page.width),
    // Keep the clicked top edge exact as well. Near the bottom, clipping is
    // preferable to silently moving the text upward.
    y: top - safeTextHeight,
  };
}
