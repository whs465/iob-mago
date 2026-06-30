import { describe, expect, it } from 'vitest';
import { clamp } from './math';

describe('math utilities', () => {
  it('clamps values inside a range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(12, 0, 10)).toBe(10);
  });
});
