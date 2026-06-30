import { describe, expect, it } from 'vitest';
import { getFileBaseName, getPdfBaseName } from './filenames';

describe('filename helpers', () => {
  it('removes a pdf extension case-insensitively', () => {
    expect(getPdfBaseName('Contrato.PDF')).toBe('Contrato');
  });

  it('leaves non-pdf extensions untouched for pdf base names', () => {
    expect(getPdfBaseName('firma.png')).toBe('firma.png');
  });

  it('removes the last extension from a generic file name', () => {
    expect(getFileBaseName('firma.final.png')).toBe('firma.final');
  });

  it('keeps names without extensions', () => {
    expect(getFileBaseName('documento')).toBe('documento');
  });
});
