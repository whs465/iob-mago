export type PdfMetadata = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: Date | null;
  modificationDate: Date | null;
};

export type EditablePdfMetadata = Pick<PdfMetadata, 'title' | 'author' | 'subject' | 'keywords' | 'creator' | 'producer'>;

type MetadataPdf = {
  getTitle(): string | undefined;
  getAuthor(): string | undefined;
  getSubject(): string | undefined;
  getKeywords(): string | undefined;
  getCreator(): string | undefined;
  getProducer(): string | undefined;
  getCreationDate(): Date | undefined;
  getModificationDate(): Date | undefined;
  setTitle(value: string): void;
  setAuthor(value: string): void;
  setSubject(value: string): void;
  setKeywords(value: string[]): void;
  setCreator(value: string): void;
  setProducer(value: string): void;
  save(options?: { useObjectStreams?: boolean }): Promise<Uint8Array>;
};

export type PdfMetadataDeps = {
  loadPdfDocument(arrayBuffer: ArrayBuffer, options?: { updateMetadata?: boolean }): Promise<MetadataPdf>;
};

function readMetadata(pdf: MetadataPdf): PdfMetadata {
  return {
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
    subject: pdf.getSubject() || '',
    keywords: pdf.getKeywords() || '',
    creator: pdf.getCreator() || '',
    producer: pdf.getProducer() || '',
    creationDate: pdf.getCreationDate() || null,
    modificationDate: pdf.getModificationDate() || null,
  };
}

export async function getPdfMetadata(file: File, deps: PdfMetadataDeps) {
  const pdf = await deps.loadPdfDocument(await file.arrayBuffer(), { updateMetadata: false });
  return readMetadata(pdf);
}

export async function writePdfMetadata(
  file: File,
  metadata: EditablePdfMetadata,
  deps: PdfMetadataDeps,
) {
  const pdf = await deps.loadPdfDocument(await file.arrayBuffer(), { updateMetadata: false });
  pdf.setTitle(metadata.title.trim());
  pdf.setAuthor(metadata.author.trim());
  pdf.setSubject(metadata.subject.trim());
  pdf.setKeywords(metadata.keywords.split(/[,;]+/).map(value => value.trim()).filter(Boolean));
  pdf.setCreator(metadata.creator.trim());
  pdf.setProducer(metadata.producer.trim());
  return pdf.save({ useObjectStreams: true });
}

export function emptyPdfMetadata(): EditablePdfMetadata {
  return { title: '', author: '', subject: '', keywords: '', creator: '', producer: '' };
}
