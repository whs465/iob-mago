export function parsePaginas(pagesStr: string, totalPages: number) {
  const result = new Set<number>();
  const parts = pagesStr.split(',').map(part => part.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n));
      if (start && end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) result.add(i - 1);
        }
      }
    } else {
      const num = parseInt(part);
      if (num >= 1 && num <= totalPages) result.add(num - 1);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}
