import { describe, expect, it } from 'vitest';
import {
  getMergeSuccessMessage,
  getRemovePagesSuccessMessage,
  getReorderSuccessMessage,
  getRotatePagesSuccessMessage,
  type Translator,
} from './pdf-status';

const translate: Translator = (english, _spanish, values = {}) => Object.entries(values)
  .reduce((text, [key, value]) => text.replace(`{{${key}}}`, value), english);

describe('PDF status messages', () => {
  it('formats merge success with and without rasterized files', () => {
    expect(getMergeSuccessMessage([], translate)).toBe('PDFs merged successfully!');
    expect(getMergeSuccessMessage(['a.pdf', 'b.pdf'], translate)).toBe(
      'PDFs merged successfully. Protected files were flattened as images: a.pdf, b.pdf',
    );
  });

  it('formats remove-pages success with count and rasterization context', () => {
    expect(getRemovePagesSuccessMessage({
      pdfBytes: new Uint8Array(),
      rasterizedFiles: [],
      removedPageCount: 2,
    }, translate)).toBe('2 page(s) removed successfully!');

    expect(getRemovePagesSuccessMessage({
      pdfBytes: new Uint8Array(),
      rasterizedFiles: ['protected.pdf'],
      removedPageCount: 2,
    }, translate)).toBe('2 page(s) removed. Protected pages were flattened as images.');
  });

  it('formats reorder and rotate success messages', () => {
    expect(getReorderSuccessMessage([], translate)).toBe('PDF reordered successfully!');
    expect(getReorderSuccessMessage(['protected.pdf'], translate)).toBe(
      'PDF reordered successfully. Protected pages were flattened as images.',
    );

    expect(getRotatePagesSuccessMessage({
      pdfBytes: new Uint8Array(),
      rasterizedFiles: [],
      rotatedCount: 3,
    }, translate)).toBe('3 page(s) rotated!');
  });
});
