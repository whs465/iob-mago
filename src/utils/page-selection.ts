import { parsePaginas } from './page-ranges';

export type RequiredPageSelection =
  | { kind: 'missing'; pages: null }
  | { kind: 'invalid'; pages: [] }
  | { kind: 'valid'; pages: number[] };

export type OptionalPageSelection =
  | { kind: 'invalid'; pages: [] }
  | { kind: 'valid'; pages: number[] | null };

export type PageRemovalSelection = {
  pagesToKeep: number[];
  removedPageCount: number;
  canRemove: boolean;
};

export function getRequiredPageSelection(pagesText: string, totalPages: number): RequiredPageSelection {
  if (!pagesText.trim()) return { kind: 'missing', pages: null };

  const pages = parsePaginas(pagesText, totalPages);
  return pages.length > 0
    ? { kind: 'valid', pages }
    : { kind: 'invalid', pages: [] };
}

export function getOptionalPageSelection(pagesText: string, totalPages: number): OptionalPageSelection {
  if (!pagesText.trim()) return { kind: 'valid', pages: null };

  const pages = parsePaginas(pagesText, totalPages);
  return pages.length > 0
    ? { kind: 'valid', pages }
    : { kind: 'invalid', pages: [] };
}

export function getPageRemovalSelection(pageCount: number, pagesToRemove: number[]): PageRemovalSelection {
  const removeSet = new Set(pagesToRemove);
  const pagesToKeep = Array.from({ length: pageCount }, (_, index) => index)
    .filter(index => !removeSet.has(index));

  return {
    pagesToKeep,
    removedPageCount: pagesToRemove.length,
    canRemove: pagesToKeep.length > 0,
  };
}
