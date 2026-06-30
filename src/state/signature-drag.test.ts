import { describe, expect, it } from 'vitest';
import { createSignatureDragState } from './signature-drag';

describe('signature drag state', () => {
  it('tracks active marker and movement', () => {
    const state = createSignatureDragState();

    state.start(2);
    expect(state.activeIndex).toBe(2);
    expect(state.movedDuringDrag).toBe(false);

    state.markMoved();
    expect(state.movedDuringDrag).toBe(true);

    expect(state.stop()).toEqual({ activeIndex: 2, movedDuringDrag: true });
    expect(state.activeIndex).toBeNull();
    expect(state.movedDuringDrag).toBe(false);
  });

  it('resets drag state', () => {
    const state = createSignatureDragState();
    state.start(1);
    state.markMoved();
    state.reset();

    expect(state.activeIndex).toBeNull();
    expect(state.movedDuringDrag).toBe(false);
  });
});
