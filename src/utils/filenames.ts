export function getPdfBaseName(filename: string) {
  return filename.replace(/\.pdf$/i, '');
}

export function getFileBaseName(filename: string) {
  return filename.replace(/\.[^.]+$/i, '');
}
