import { describe, expect, it, vi } from 'vitest';
import type { PdfOperationDeps } from './operations';
import { mergePdfFilesAction } from './merge-action';

function makeFile(name: string) {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

describe('mergePdfFilesAction', () => {
  it('rejects merges with fewer than two files', async () => {
    const mergePdfFiles = vi.fn();

    const result = await mergePdfFilesAction([makeFile('one.pdf')], {
      addFileBookmarks: true,
      operationDeps: {} as PdfOperationDeps,
      mergePdfFiles,
    });

    expect(result).toEqual({ status: 'not-enough-files' });
    expect(mergePdfFiles).not.toHaveBeenCalled();
  });

  it('merges files with bookmark and progress options', async () => {
    const files = [makeFile('one.pdf'), makeFile('two.pdf')];
    const operationDeps = {} as PdfOperationDeps;
    const onFileProcessing = vi.fn();
    const mergePdfFiles = vi.fn(async () => ({
      pdfBytes: new Uint8Array([1, 2, 3]),
      rasterizedFiles: ['two.pdf'],
    }));

    const result = await mergePdfFilesAction(files, {
      addFileBookmarks: true,
      operationDeps,
      mergePdfFiles,
      onFileProcessing,
    });

    expect(result).toEqual({
      status: 'ok',
      result: {
        pdfBytes: new Uint8Array([1, 2, 3]),
        rasterizedFiles: ['two.pdf'],
      },
    });
    expect(mergePdfFiles).toHaveBeenCalledWith(files, {
      addFileBookmarks: true,
      deps: operationDeps,
      onFileProcessing,
    });
  });
});
