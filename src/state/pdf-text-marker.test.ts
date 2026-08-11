import { describe, expect, it } from 'vitest';
import { createPdfTextMarkerState } from './pdf-text-marker';

describe('createPdfTextMarkerState', () => {
  it('stores, updates and clears the current text marker', () => {
    const state = createPdfTextMarkerState();
    state.set({ page: 2, x: 10, y: 20, text: 'Aprobado', fontSize: 12 });
    state.updateText('Revisado');
    state.updateFontSize(14);

    expect(state.marker).toEqual({ page: 2, x: 10, y: 20, text: 'Revisado', fontSize: 14 });
    state.clear();
    expect(state.marker).toBeNull();
  });
});
