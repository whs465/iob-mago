import { describe, expect, it, vi } from 'vitest';
import { createSignaturePreviewState } from './signature-preview';

describe('signature preview state', () => {
  it('tracks and replaces active object URLs', () => {
    const state = createSignaturePreviewState();
    const urls = { revokeObjectURL: vi.fn() };

    state.setObjectUrl('blob:first', urls);
    state.setObjectUrl('blob:second', urls);

    expect(state.objectUrl).toBe('blob:second');
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:first');
  });

  it('clears the current object URL', () => {
    const state = createSignaturePreviewState();
    const urls = { revokeObjectURL: vi.fn() };

    state.setObjectUrl('blob:first', urls);
    state.clear(urls);

    expect(state.objectUrl).toBeNull();
    expect(urls.revokeObjectURL).toHaveBeenCalledWith('blob:first');
  });
});
