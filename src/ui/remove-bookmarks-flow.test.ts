import { describe, expect, it, vi } from 'vitest';
import { removePdfBookmarks } from '../pdf/remove-bookmarks';
import { removeBookmarksFlow } from './remove-bookmarks-flow';

vi.mock('../pdf/remove-bookmarks', () => ({ removePdfBookmarks: vi.fn() }));

describe('remove bookmarks flow', () => {
  it.each([true, false])('downloads only when there was an outline (%s)', async hasBookmarks => {
    vi.mocked(removePdfBookmarks).mockResolvedValueOnce(hasBookmarks ? Uint8Array.of(1) : null);
    const saveAs = vi.fn();
    const finish = vi.fn();
    const showStatus = vi.fn();
    await removeBookmarksFlow({
      file: new File(['PDF'], 'informe.pdf'),
      i18n: (_english, spanish) => spanish,
      showStatus,
      setActionBusy: () => finish,
      saveAs,
    });
    if (hasBookmarks) expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'informe-sin-marcadores.pdf');
    else expect(saveAs).not.toHaveBeenCalled();
    expect(showStatus).toHaveBeenCalledWith(
      hasBookmarks ? 'Copia descargada sin marcadores' : 'Este PDF no tiene marcadores',
      'success',
    );
    expect(finish).toHaveBeenCalledOnce();
  });
});
