import { describe, expect, it, vi } from 'vitest';
import { signPdfWithImage } from './sign';

function makeFile(name = 'source.pdf') {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

function makePdfDoc(pageCount = 2) {
  const pages = Array.from({ length: pageCount }, () => ({
    drawImage: vi.fn(),
    drawText: vi.fn(),
    getSize: vi.fn(() => ({ width: 600, height: 800 })),
  }));
  return {
    embedPng: vi.fn(async () => ({ width: 200, height: 100, kind: 'png' })),
    embedJpg: vi.fn(async () => ({ width: 300, height: 100, kind: 'jpg' })),
    embedFont: vi.fn(async () => ({
      widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5,
      heightAtSize: (size: number) => size,
    })),
    getPageCount: vi.fn(() => pageCount),
    getPage: vi.fn((index: number) => pages[index]),
    save: vi.fn(async () => new Uint8Array([1, 2, 3])),
    pages,
  };
}

describe('signPdfWithImage', () => {
  it('draws signatures on their marker pages and centers the image', async () => {
    const pdfDoc = makePdfDoc(3);
    const deps = { loadPdfDocument: vi.fn(async () => pdfDoc) };

    const result = await signPdfWithImage(
      makeFile(),
      new ArrayBuffer(4),
      [
        { page: 1, x: 150, y: 200, size: 100 },
        { page: 3, x: 50, y: 80, size: 40 },
      ],
      { applyAllPages: false, imageType: 'image/png', deps },
    );

    expect(pdfDoc.embedPng).toHaveBeenCalledOnce();
    expect(pdfDoc.getPage).toHaveBeenCalledWith(0);
    expect(pdfDoc.getPage).toHaveBeenCalledWith(2);
    expect(pdfDoc.pages[0].drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'png' }),
      { x: 100, y: 175, width: 100, height: 50 },
    );
    expect(pdfDoc.pages[2].drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'png' }),
      { x: 30, y: 70, width: 40, height: 20 },
    );
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('uses the first marker on every page when requested', async () => {
    const pdfDoc = makePdfDoc(2);
    const deps = { loadPdfDocument: vi.fn(async () => pdfDoc) };

    await signPdfWithImage(
      makeFile(),
      new ArrayBuffer(4),
      [{ page: 1, x: 100, y: 100, size: 60 }],
      { applyAllPages: true, imageType: 'image/png', deps },
    );

    expect(pdfDoc.getPage).toHaveBeenCalledWith(0);
    expect(pdfDoc.getPage).toHaveBeenCalledWith(1);
    expect(pdfDoc.pages[0].drawImage).toHaveBeenCalledOnce();
    expect(pdfDoc.pages[1].drawImage).toHaveBeenCalledOnce();
  });

  it('uses JPG embedding when the signature type is JPEG', async () => {
    const pdfDoc = makePdfDoc(1);
    const deps = { loadPdfDocument: vi.fn(async () => pdfDoc) };

    await signPdfWithImage(
      makeFile(),
      new ArrayBuffer(4),
      [{ page: 1, x: 100, y: 100, size: 60 }],
      { applyAllPages: false, imageType: 'image/jpeg', deps },
    );

    expect(pdfDoc.embedJpg).toHaveBeenCalledOnce();
    expect(pdfDoc.embedPng).not.toHaveBeenCalled();
    expect(pdfDoc.pages[0].drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'jpg' }),
      expect.any(Object),
    );
  });

  it('throws a clear error for unsupported signature formats', async () => {
    const pdfDoc = makePdfDoc(1);
    pdfDoc.embedPng = vi.fn(async () => {
      throw new Error('not png');
    });
    pdfDoc.embedJpg = vi.fn(async () => {
      throw new Error('not jpg');
    });
    const deps = { loadPdfDocument: vi.fn(async () => pdfDoc) };

    await expect(signPdfWithImage(
      makeFile(),
      new Uint8Array([0x52, 0x49, 0x46, 0x46]).buffer,
      [{ page: 1, x: 100, y: 100, size: 60 }],
      { applyAllPages: false, deps },
    )).rejects.toThrow('Unsupported signature image format. Use PNG or JPG.');
  });

  it('adds vector text without requiring a signature image', async () => {
    const pdfDoc = makePdfDoc(2);

    await signPdfWithImage(
      makeFile(),
      null,
      [],
      {
        applyAllPages: false,
        deps: { loadPdfDocument: vi.fn(async () => pdfDoc) },
        textPlacements: [{ text: 'Aprobado', pageIndex: 1, x: 120, y: 200, fontSize: 12 }],
      },
    );

    expect(pdfDoc.embedPng).not.toHaveBeenCalled();
    expect(pdfDoc.pages[1].drawText).toHaveBeenCalledWith(
      'Aprobado',
      expect.objectContaining({ x: 120, y: 188, size: 12 }),
    );
  });

  it('does not move text left when its anchor is near the right edge', async () => {
    const pdfDoc = makePdfDoc(1);

    await signPdfWithImage(
      makeFile(),
      null,
      [],
      {
        applyAllPages: false,
        deps: { loadPdfDocument: vi.fn(async () => pdfDoc) },
        textPlacements: [{ text: 'Aprobado', pageIndex: 0, x: 590, y: 200, fontSize: 12 }],
      },
    );

    expect(pdfDoc.pages[0].drawText).toHaveBeenCalledWith(
      'Aprobado',
      expect.objectContaining({ x: 590, y: 188 }),
    );
  });
});
