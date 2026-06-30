export type SourceFileState = {
  readonly files: File[];
  readonly version: number;
  setFiles(files: File[]): void;
  clear(): void;
  moveFile(fromIndex: number | null, toIndex: number): boolean;
  removeFile(index: number): boolean;
  beginAnalysis(): number;
};

function isValidIndex(index: number | null, length: number): index is number {
  return (
    typeof index === 'number'
    && !Number.isNaN(index)
    && index >= 0
    && index < length
  );
}

export function createSourceFileState(initialFiles: File[] = []): SourceFileState {
  let files = [...initialFiles];
  let version = 0;

  const invalidate = () => {
    version += 1;
  };

  return {
    get files() {
      return files;
    },

    get version() {
      return version;
    },

    setFiles(nextFiles) {
      files = [...nextFiles];
      invalidate();
    },

    clear() {
      files = [];
      invalidate();
    },

    moveFile(fromIndex, toIndex) {
      if (
        !isValidIndex(fromIndex, files.length)
        || !isValidIndex(toIndex, files.length)
        || fromIndex === toIndex
      ) {
        return false;
      }

      const nextFiles = [...files];
      const [file] = nextFiles.splice(fromIndex, 1);
      nextFiles.splice(toIndex, 0, file);
      files = nextFiles;
      invalidate();
      return true;
    },

    removeFile(index) {
      if (!isValidIndex(index, files.length)) return false;

      files = files.filter((_, fileIndex) => fileIndex !== index);
      invalidate();
      return true;
    },

    beginAnalysis() {
      invalidate();
      return version;
    },
  };
}
