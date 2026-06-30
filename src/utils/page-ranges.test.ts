import { describe, expect, it } from 'vitest';
import { parsePaginas } from './page-ranges';

describe('parsePaginas', () => {
  it('parses individual pages as zero-based indices', () => {
    expect(parsePaginas('1, 3, 5', 10)).toEqual([0, 2, 4]);
  });

  it('parses inclusive ranges', () => {
    expect(parsePaginas('2-4', 10)).toEqual([1, 2, 3]);
  });

  it('deduplicates and sorts pages', () => {
    expect(parsePaginas('5, 2, 2, 3-5', 10)).toEqual([1, 2, 3, 4]);
  });

  it('ignores pages outside the document', () => {
    expect(parsePaginas('0, 1, 4, 9-11', 5)).toEqual([0, 3]);
  });

  it('ignores invalid fragments', () => {
    expect(parsePaginas('x, 2-a, -, 3', 5)).toEqual([2]);
  });
});
