import { describe, expect, it } from 'vitest';
import {
  createI18n,
  getLanguageFromPreferences,
  getLocaleForLanguage,
  parseInputDate,
  toDateInputValue,
} from './locale';

describe('locale utilities', () => {
  it('detects Spanish and English from browser preferences', () => {
    expect(getLanguageFromPreferences(['es-CO'])).toBe('es');
    expect(getLanguageFromPreferences(['en-US'])).toBe('en');
    expect(getLanguageFromPreferences([], 'es')).toBe('es');
  });

  it('maps app language to locale', () => {
    expect(getLocaleForLanguage('es')).toBe('es-CO');
    expect(getLocaleForLanguage('en')).toBe('en-GB');
  });

  it('translates text and replaces variables', () => {
    const i18n = createI18n('es');
    expect(i18n('Hello {{name}}', 'Hola {{name}}', { name: 'Mago' })).toBe('Hola Mago');
  });

  it('parses and formats date input values', () => {
    const date = parseInputDate('2026-06-29');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(29);
    expect(toDateInputValue(date)).toBe('2026-06-29');
  });
});
