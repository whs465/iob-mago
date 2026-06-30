// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createSignatureViewerState } from '../state/signature-viewer';
import {
  changeSignatureViewerPage,
  renderSignatureViewerPage,
} from './signature-navigation-flow';

describe('signature navigation flow', () => {
  it('renders a viewer page through the shared render helper', async () => {
    const viewerState = createSignatureViewerState();
    const renderPage = vi.fn(async () => true);
    const updateMarkersDisplay = vi.fn();
    const canvas = document.createElement('canvas');
    const canvasWrapper = document.createElement('div');
    const formatPageInfo = vi.fn((page: number, total: number) => `${page}/${total}`);

    const result = await renderSignatureViewerPage({
      viewerState,
      pageNumber: 2,
      canvas,
      canvasWrapper,
      formatPageInfo,
      updateMarkersDisplay,
      renderPage,
    });

    expect(result).toBe(true);
    expect(renderPage).toHaveBeenCalledWith({
      viewerState,
      pageNumber: 2,
      canvas,
      canvasWrapper,
      formatPageInfo,
      onRendered: updateMarkersDisplay,
    });
  });

  it('changes page only when the viewer can move', async () => {
    const viewerState = createSignatureViewerState();
    viewerState.load(new File(['pdf'], 'doc.pdf', { type: 'application/pdf' }), {
      numPages: 3,
      getPage: vi.fn(),
    }, 3);
    const onPageChange = vi.fn(async () => undefined);

    expect(changeSignatureViewerPage({
      viewerState,
      delta: 1,
      onPageChange,
    })).toBe(true);
    expect(onPageChange).toHaveBeenCalledWith(2);

    expect(changeSignatureViewerPage({
      viewerState,
      delta: 5,
      onPageChange,
    })).toBe(false);
    expect(onPageChange).toHaveBeenCalledTimes(1);
  });
});
