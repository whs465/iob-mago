export type CompressionMode = 'safe' | 'balanced' | 'compact';

type SavablePdf = {
  save(options?: { useObjectStreams?: boolean; addDefaultPage?: boolean; objectsPerTick?: number }): Promise<Uint8Array>;
};

export type CompressPdfDeps = {
  loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<SavablePdf>;
  buildCompressedPdfFromRenderedPages(
    arrayBuffer: ArrayBuffer,
    options: { scale: number; quality: number; onProgress?: (completed: number, total: number) => void },
  ): Promise<Uint8Array>;
};

export type CompressPdfResult = {
  pdfBytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  mode: CompressionMode;
  rasterized: boolean;
  keptOriginal: boolean;
  attempts: number;
};

const MIN_MEANINGFUL_REDUCTION_BYTES = 4 * 1024;
const MIN_MEANINGFUL_REDUCTION_RATIO = 0.01;

export function hasMeaningfulSafeReduction(originalSize: number, candidateSize: number) {
  const savedBytes = originalSize - candidateSize;
  return (
    savedBytes >= MIN_MEANINGFUL_REDUCTION_BYTES
    && savedBytes / originalSize >= MIN_MEANINGFUL_REDUCTION_RATIO
  );
}

const visualPresets: Record<Exclude<CompressionMode, 'safe'>, Array<{ scale: number; quality: number }>> = {
  // Quality-first: only lowers resolution if the first pass cannot beat the source.
  balanced: [
    { scale: 1.5, quality: 0.82 },
    { scale: 1.25, quality: 0.75 },
    { scale: 1.05, quality: 0.68 },
  ],
  // Size-first, while keeping enough resolution for ordinary document reading.
  compact: [
    { scale: 1.1, quality: 0.66 },
    { scale: 0.95, quality: 0.59 },
    { scale: 0.85, quality: 0.52 },
  ],
} as const;

async function buildBestVisualCandidate(
  sourceBuffer: ArrayBuffer,
  originalSize: number,
  mode: Exclude<CompressionMode, 'safe'>,
  deps: CompressPdfDeps,
  onProgress?: (completed: number, total: number) => void,
) {
  let smallestCandidate: Uint8Array | null = null;
  let attempts = 0;
  const targetRatio = mode === 'balanced' ? 0.9 : 0.72;

  for (const preset of visualPresets[mode]) {
    attempts += 1;
    const candidate = await deps.buildCompressedPdfFromRenderedPages(
      sourceBuffer.slice(0),
      { ...preset, onProgress },
    );

    if (!smallestCandidate || candidate.byteLength < smallestCandidate.byteLength) {
      smallestCandidate = candidate;
    }

    // Stop once this mode has reached a meaningful reduction. Otherwise the
    // next pass trades a little more visual fidelity for a smaller file.
    if (candidate.byteLength <= originalSize * targetRatio) break;
  }

  if (!smallestCandidate) throw new Error('Could not create a compressed PDF candidate');
  return { candidate: smallestCandidate, attempts };
}

export async function compressPdf(
  file: File,
  mode: CompressionMode,
  deps: CompressPdfDeps,
  onProgress?: (completed: number, total: number) => void,
): Promise<CompressPdfResult> {
  const sourceBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(sourceBuffer);

  let candidate: Uint8Array;
  let rasterized = false;
  let attempts = 1;

  if (mode === 'safe') {
    const pdf = await deps.loadPdfDocument(sourceBuffer.slice(0));
    candidate = await pdf.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
  } else {
    rasterized = true;
    const visualResult = await buildBestVisualCandidate(
      sourceBuffer,
      originalBytes.byteLength,
      mode,
      deps,
      onProgress,
    );
    candidate = visualResult.candidate;
    attempts = visualResult.attempts;
  }

  const keptOriginal = mode === 'safe'
    ? !hasMeaningfulSafeReduction(originalBytes.byteLength, candidate.byteLength)
    : candidate.byteLength >= originalBytes.byteLength;
  const pdfBytes = keptOriginal ? originalBytes : candidate;

  return {
    pdfBytes,
    originalSize: originalBytes.byteLength,
    outputSize: pdfBytes.byteLength,
    mode,
    rasterized,
    keptOriginal,
    attempts,
  };
}
