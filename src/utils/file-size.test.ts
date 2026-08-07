import { describe, expect, it } from 'vitest';
import { formatFileSize, getSizeReduction } from './file-size';

describe('file size helpers', () => {
  it('formats bytes using readable binary units', () => {
    expect(formatFileSize(0, 'en')).toBe('0 B');
    expect(formatFileSize(1536, 'en')).toBe('1.5 KB');
    expect(formatFileSize(5 * 1024 * 1024, 'en')).toBe('5 MB');
  });

  it('calculates a non-negative rounded reduction', () => {
    expect(getSizeReduction(1000, 610)).toBe(39);
    expect(getSizeReduction(1000, 1200)).toBe(0);
  });
});
