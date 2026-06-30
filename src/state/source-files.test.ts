import { describe, expect, it } from 'vitest';
import { createSourceFileState } from './source-files';

function makeFile(name: string) {
  return new File(['pdf'], name, { type: 'application/pdf' });
}

describe('source file state', () => {
  it('sets files defensively and increments the version', () => {
    const state = createSourceFileState();
    const files = [makeFile('a.pdf')];

    state.setFiles(files);
    files.push(makeFile('b.pdf'));

    expect(state.files.map(file => file.name)).toEqual(['a.pdf']);
    expect(state.version).toBe(1);
  });

  it('moves files and rejects invalid moves', () => {
    const state = createSourceFileState([
      makeFile('a.pdf'),
      makeFile('b.pdf'),
      makeFile('c.pdf'),
    ]);

    expect(state.moveFile(2, 0)).toBe(true);
    expect(state.files.map(file => file.name)).toEqual(['c.pdf', 'a.pdf', 'b.pdf']);
    expect(state.version).toBe(1);

    expect(state.moveFile(null, 1)).toBe(false);
    expect(state.moveFile(4, 0)).toBe(false);
    expect(state.version).toBe(1);
  });

  it('removes files and invalidates analysis', () => {
    const state = createSourceFileState([makeFile('a.pdf'), makeFile('b.pdf')]);

    expect(state.beginAnalysis()).toBe(1);
    expect(state.removeFile(0)).toBe(true);
    expect(state.files.map(file => file.name)).toEqual(['b.pdf']);
    expect(state.version).toBe(2);

    expect(state.removeFile(3)).toBe(false);
    expect(state.version).toBe(2);
  });
});
