// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { readMetadataForm, renderMetadataForm } from './pdf-metadata-flow';

describe('metadata form helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="metadata-editor" hidden></div><span id="metadata-dates"></span>
      <input id="metadata-title"><input id="metadata-author"><input id="metadata-subject">
      <input id="metadata-keywords"><input id="metadata-creator"><input id="metadata-producer">`;
  });

  it('renders and reads editable metadata', () => {
    renderMetadataForm({ title: 'Report', author: 'Ana', subject: 'S', keywords: 'one', creator: 'App', producer: 'PDF' }, 'en');
    expect(readMetadataForm()).toEqual({ title: 'Report', author: 'Ana', subject: 'S', keywords: 'one', creator: 'App', producer: 'PDF' });
    expect(document.getElementById('metadata-editor')?.hasAttribute('hidden')).toBe(false);
  });
});
