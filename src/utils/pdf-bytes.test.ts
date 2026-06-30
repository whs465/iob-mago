import { describe, expect, it } from 'vitest';
import { pdfBytesToBlob } from './pdf-bytes';

describe('pdfBytesToBlob', () => {
  it('wraps array buffers as PDF blobs', async () => {
    const source = new Uint8Array([37, 80, 68, 70]).buffer;

    const blob = pdfBytesToBlob(source);

    expect(blob.type).toBe('application/pdf');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([37, 80, 68, 70]);
  });

  it('preserves only the visible range of a Uint8Array view', async () => {
    const backing = new Uint8Array([0, 37, 80, 68, 70, 0]);

    const blob = pdfBytesToBlob(backing.subarray(1, 5));

    expect(blob.size).toBe(4);
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([37, 80, 68, 70]);
  });
});
