import type { AppLanguage } from './locale';
import { clamp } from './math';

export type SignatureToneStop = {
  position: number;
  color: string;
  es: string;
  en: string;
};

export type SignatureTone = {
  value: number;
  color: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  label: string;
};

export const signatureDarkTones: SignatureToneStop[] = [
  { position: 0, color: '#050505', es: 'Negro', en: 'Black' },
  { position: 18, color: '#061f4a', es: 'Azul oscuro', en: 'Dark blue' },
  { position: 36, color: '#0f342e', es: 'Verde petróleo', en: 'Deep teal' },
  { position: 54, color: '#3a2413', es: 'Café oscuro', en: 'Dark brown' },
  { position: 72, color: '#4a1010', es: 'Rojo oscuro', en: 'Dark red' },
  { position: 86, color: '#2f1645', es: 'Morado oscuro', en: 'Dark purple' },
  { position: 100, color: '#111827', es: 'Grafito', en: 'Graphite' },
];

export function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return '#' + [r, g, b].map(value => {
    return Math.round(value).toString(16).padStart(2, '0');
  }).join('');
}

export function interpolateColor(startHex: string, endHex: string, ratio: number) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  return {
    r: start.r + (end.r - start.r) * ratio,
    g: start.g + (end.g - start.g) * ratio,
    b: start.b + (end.b - start.b) * ratio,
  };
}

export function getSignatureTone(
  toneValue: string | number,
  language: AppLanguage,
  tones = signatureDarkTones,
): SignatureTone {
  const value = clamp(Number(toneValue) || 0, 0, 100);
  let previousTone = tones[0];
  let nextTone = tones[tones.length - 1];

  for (let index = 0; index < tones.length; index++) {
    const currentTone = tones[index];
    if (currentTone.position <= value) previousTone = currentTone;
    if (currentTone.position >= value) {
      nextTone = currentTone;
      break;
    }
  }

  const span = nextTone.position - previousTone.position;
  const ratio = span > 0 ? (value - previousTone.position) / span : 0;
  const rgb = interpolateColor(previousTone.color, nextTone.color, ratio);
  const closestTone = Math.abs(value - previousTone.position) <= Math.abs(value - nextTone.position)
    ? previousTone
    : nextTone;

  return {
    value,
    color: rgbToHex(rgb),
    rgb: {
      r: Math.round(rgb.r),
      g: Math.round(rgb.g),
      b: Math.round(rgb.b),
    },
    label: language === 'es' ? closestTone.es : closestTone.en,
  };
}
