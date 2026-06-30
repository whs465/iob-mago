import { describe, expect, it } from 'vitest';
import { getSignatureTone, hexToRgb, interpolateColor, rgbToHex } from './signature-tone';

describe('signature tone utilities', () => {
  it('converts between hex and rgb', () => {
    expect(hexToRgb('#0f342e')).toEqual({ r: 15, g: 52, b: 46 });
    expect(rgbToHex({ r: 15, g: 52, b: 46 })).toBe('#0f342e');
  });

  it('interpolates colors', () => {
    expect(interpolateColor('#000000', '#ffffff', 0.5)).toEqual({
      r: 127.5,
      g: 127.5,
      b: 127.5,
    });
  });

  it('selects interpolated tone and localized nearest label', () => {
    expect(getSignatureTone(18, 'en')).toMatchObject({
      value: 18,
      color: '#061f4a',
      rgb: { r: 6, g: 31, b: 74 },
      label: 'Dark blue',
    });
    expect(getSignatureTone(90, 'es').label).toBe('Morado oscuro');
  });

  it('clamps tone values', () => {
    expect(getSignatureTone(999, 'en').value).toBe(100);
    expect(getSignatureTone(-10, 'en').value).toBe(0);
  });
});
