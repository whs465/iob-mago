import { describe, expect, it } from 'vitest';
import { getOptionalPageSelection, getPageRemovalSelection, getRequiredPageSelection } from './page-selection';

describe('page selection utilities', () => {
  it('parses required page selections', () => {
    expect(getRequiredPageSelection('1, 3-4', 5)).toEqual({
      kind: 'valid',
      pages: [0, 2, 3],
    });
  });

  it('distinguishes missing and invalid required selections', () => {
    expect(getRequiredPageSelection('  ', 5)).toEqual({
      kind: 'missing',
      pages: null,
    });
    expect(getRequiredPageSelection('8-9', 5)).toEqual({
      kind: 'invalid',
      pages: [],
    });
  });

  it('treats blank optional selections as all pages', () => {
    expect(getOptionalPageSelection('', 5)).toEqual({
      kind: 'valid',
      pages: null,
    });
  });

  it('returns the pages that remain after removal', () => {
    expect(getPageRemovalSelection(5, [1, 3])).toEqual({
      pagesToKeep: [0, 2, 4],
      removedPageCount: 2,
      canRemove: true,
    });
  });

  it('marks removal invalid when no page would remain', () => {
    expect(getPageRemovalSelection(3, [0, 1, 2])).toEqual({
      pagesToKeep: [],
      removedPageCount: 3,
      canRemove: false,
    });
  });

  it('deduplicates pages only for the keep calculation', () => {
    expect(getPageRemovalSelection(4, [1, 1, 2])).toEqual({
      pagesToKeep: [0, 3],
      removedPageCount: 3,
      canRemove: true,
    });
  });
});
