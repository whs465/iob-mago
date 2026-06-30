import { describe, expect, it } from 'vitest';
import { createPageOrderState } from './page-order';

describe('page order state', () => {
  it('creates one order item per page and tracks the source version', () => {
    const state = createPageOrderState();

    state.setPageCount(3, 7);

    expect(state.pages).toEqual([
      { originalIndex: 0 },
      { originalIndex: 1 },
      { originalIndex: 2 },
    ]);
    expect(state.sourceVersion).toBe(7);
  });

  it('moves pages and exposes original indexes', () => {
    const state = createPageOrderState();
    state.setPageCount(4, 2);

    expect(state.movePage(3, 1)).toBe(true);

    expect(state.pages).toEqual([
      { originalIndex: 0 },
      { originalIndex: 3 },
      { originalIndex: 1 },
      { originalIndex: 2 },
    ]);
    expect(state.getOriginalIndexes()).toEqual([0, 3, 1, 2]);
  });

  it('rejects invalid moves and clears loaded pages', () => {
    const state = createPageOrderState();
    state.setPageCount(2, 5);

    expect(state.movePage(null, 1)).toBe(false);
    expect(state.movePage(0, 0)).toBe(false);
    expect(state.movePage(0, 3)).toBe(false);
    expect(state.getOriginalIndexes()).toEqual([0, 1]);

    state.clear();

    expect(state.pages).toEqual([]);
    expect(state.sourceVersion).toBe(-1);
  });
});
