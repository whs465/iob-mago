export type AppLanguage = 'es' | 'en';

export type I18nVars = Record<string, string>;

export function getLanguageFromPreferences(
  languages: readonly string[] | null | undefined,
  fallbackLanguage = 'es',
): AppLanguage {
  const preferredLanguage = Array.isArray(languages) && languages.length
    ? languages[0]
    : fallbackLanguage;

  return String(preferredLanguage).toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function getLocaleForLanguage(language: AppLanguage) {
  return language === 'es' ? 'es-CO' : 'en-GB';
}

export function createI18n(language: AppLanguage) {
  return function i18n(englishText: string, spanishText: string, vars: I18nVars = {}) {
    let text = language === 'es' ? spanishText : englishText;
    Object.entries(vars).forEach(([key, value]) => {
      text = text.split(`{{${key}}}`).join(value);
    });
    return text;
  };
}

export function formatDateValue(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTimeValue(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function parseInputDate(dateStr: string) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createLocaleRuntime(
  languages: readonly string[] | null | undefined,
  fallbackLanguage = 'es',
) {
  const language = getLanguageFromPreferences(languages, fallbackLanguage);
  const locale = getLocaleForLanguage(language);

  return {
    language,
    locale,
    i18n: createI18n(language),
    formatDateValue: (date: Date) => formatDateValue(date, locale),
    formatDateTimeValue: (date: Date) => formatDateTimeValue(date, locale),
  };
}
