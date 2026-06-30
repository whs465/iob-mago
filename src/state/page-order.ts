import type { OrderPage } from '../ui/order-list';

export type PageOrderState = {
  readonly pages: OrderPage[];
  readonly sourceVersion: number;
  setPageCount(pageCount: number, sourceVersion: number): void;
  clear(): void;
  movePage(fromIndex: number | null, toIndex: number): boolean;
  getOriginalIndexes(): number[];
};

function isValidIndex(index: number | null, length: number): index is number {
  return (
    typeof index === 'number'
    && !Number.isNaN(index)
    && index >= 0
    && index < length
  );
}

export function createPageOrderState(): PageOrderState {
  let pages: OrderPage[] = [];
  let sourceVersion = -1;

  return {
    get pages() {
      return pages;
    },

    get sourceVersion() {
      return sourceVersion;
    },

    setPageCount(pageCount, nextSourceVersion) {
      pages = Array.from({ length: pageCount }, (_, index) => ({ originalIndex: index }));
      sourceVersion = nextSourceVersion;
    },

    clear() {
      pages = [];
      sourceVersion = -1;
    },

    movePage(fromIndex, toIndex) {
      if (
        !isValidIndex(fromIndex, pages.length)
        || !isValidIndex(toIndex, pages.length)
        || fromIndex === toIndex
      ) {
        return false;
      }

      const nextPages = [...pages];
      const [page] = nextPages.splice(fromIndex, 1);
      nextPages.splice(toIndex, 0, page);
      pages = nextPages;
      return true;
    },

    getOriginalIndexes() {
      return pages.map(page => page.originalIndex);
    },
  };
}
