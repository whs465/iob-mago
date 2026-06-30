import { describe, expect, it, vi } from 'vitest';
import { createPreparedSignatureState } from '../state/prepared-signature';
import {
  createPreparedSignatureFile,
  downloadPreparedSignatureBlob,
  getPreparedSignatureFileName,
} from './prepared-signature-actions';

function makeState(fileName = 'signature-firma.png') {
  const state = createPreparedSignatureState();
  state.setPrepared({
    canvas: {} as HTMLCanvasElement,
    blob: new Blob(['png'], { type: 'image/png' }),
    fileName,
    width: 1,
    height: 1,
  }, {
    createObjectURL: () => 'blob:prepared',
    revokeObjectURL: () => undefined,
  });
  return state;
}

describe('prepared signature actions', () => {
  it('uses a fallback filename when prepared state has no name', () => {
    expect(getPreparedSignatureFileName(makeState(''))).toBe('firma.png');
  });

  it('downloads the prepared signature blob', () => {
    const state = makeState();
    const saveAs = vi.fn();

    const result = downloadPreparedSignatureBlob(state, saveAs);

    expect(result).toEqual({ status: 'ok', fileName: 'signature-firma.png' });
    expect(saveAs).toHaveBeenCalledWith(state.blob, 'signature-firma.png');
  });

  it('reports missing data when no prepared signature is available', () => {
    const state = createPreparedSignatureState();
    const saveAs = vi.fn();

    expect(downloadPreparedSignatureBlob(state, saveAs)).toEqual({
      status: 'missing-prepared-signature',
    });
    expect(createPreparedSignatureFile(state)).toEqual({
      status: 'missing-prepared-signature',
    });
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('creates a PNG file from the prepared signature blob', () => {
    const state = makeState();

    const result = createPreparedSignatureFile(state);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.file.name).toBe('signature-firma.png');
    expect(result.file.type).toBe('image/png');
  });
});
