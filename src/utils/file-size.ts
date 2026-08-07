export function formatFileSize(bytes: number, locale = 'es') {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unitIndex);
  const maximumFractionDigits = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)} ${units[unitIndex]}`;
}

export function getSizeReduction(originalBytes: number, outputBytes: number) {
  if (originalBytes <= 0) return 0;
  return Math.max(0, Math.round((1 - outputBytes / originalBytes) * 100));
}
