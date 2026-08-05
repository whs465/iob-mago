const SIGNATURE_IMAGE_KEY = 'firmaImagen'; // legacy / backward compat
const SIGNATURE_IMAGE_KEY_1 = 'firmaImagen_1';
const SIGNATURE_IMAGE_KEY_2 = 'firmaImagen_2';
const SIGNATURE_SIZE_KEY = 'firmaTamano';
const SIGNATURE_SLOT_KEY = 'firmaSlotSeleccionada';

export type StoredSignatureImage = {
  dataUrl: string;
  name: string;
  bytes: ArrayBuffer;
  mimeType: string;
};

type StoredSignatureImageRecord = {
  dataUrl?: unknown;
  nombre?: unknown;
  name?: unknown;
  mimeType?: unknown;
};

function normalizeStoredDataUrl(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  const withoutQuotes = trimmedValue.startsWith('"') && trimmedValue.endsWith('"')
    ? trimmedValue.slice(1, -1)
    : trimmedValue;

  return withoutQuotes.startsWith('data:') ? withoutQuotes : null;
}

function getDataUrlMimeType(dataUrl: string) {
  const mimeMatch = dataUrl.match(/^data:([^;,]+)[;,]/i);
  return mimeMatch?.[1]?.toLowerCase() || 'application/octet-stream';
}

function dataUrlToArrayBuffer(dataUrl: string) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('The signature image could not be read as a data URL.'));
    };
    reader.onerror = () => reject(reader.error || new Error('The signature image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function parseStoredSignaturePayload(rawValue: string): StoredSignatureImage | null {
  try {
    const parsedValue = rawValue.trim().startsWith('data:')
      ? rawValue
      : JSON.parse(rawValue) as StoredSignatureImageRecord | string;

    if (typeof parsedValue === 'string') {
      const dataUrl = normalizeStoredDataUrl(parsedValue);
      if (!dataUrl) throw new Error('Missing stored signature data URL.');

      return {
        dataUrl,
        name: '',
        bytes: dataUrlToArrayBuffer(dataUrl),
        mimeType: getDataUrlMimeType(dataUrl),
      };
    }

    const dataUrl = normalizeStoredDataUrl(parsedValue.dataUrl);
    if (!dataUrl) throw new Error('Missing stored signature data URL.');
    const name = typeof parsedValue.nombre === 'string'
      ? parsedValue.nombre
      : typeof parsedValue.name === 'string'
        ? parsedValue.name
        : '';
    const mimeType = typeof parsedValue.mimeType === 'string'
      ? parsedValue.mimeType.toLowerCase()
      : getDataUrlMimeType(dataUrl);

    return {
      dataUrl,
      name,
      bytes: dataUrlToArrayBuffer(dataUrl),
      mimeType,
    };
  } catch {
    return null;
  }
}

export function loadStoredSignatureImage(storage: Storage = localStorage): StoredSignatureImage | null {
  const storedValue = storage.getItem(SIGNATURE_IMAGE_KEY);
  if (!storedValue) return null;

  const image = parseStoredSignaturePayload(storedValue);
  if (!image) {
    storage.removeItem(SIGNATURE_IMAGE_KEY);
    return null;
  }
  return image;
}

function storageKeyForSlot(slot: 1 | 2): string {
  return slot === 1 ? SIGNATURE_IMAGE_KEY_1 : SIGNATURE_IMAGE_KEY_2;
}

export function loadStoredSignatureImageFromSlot(slot: 1 | 2, storage: Storage = localStorage): StoredSignatureImage | null {
  const key = storageKeyForSlot(slot);
  const storedValue = storage.getItem(key);
  if (!storedValue) return null;

  const image = parseStoredSignaturePayload(storedValue);
  if (!image) {
    storage.removeItem(key);
    return null;
  }
  return image;
}

export async function saveSignatureImageFile(file: File, storage: Storage = localStorage) {
  const dataUrl = await readFileAsDataUrl(file);
  storage.setItem(SIGNATURE_IMAGE_KEY, JSON.stringify({
    dataUrl,
    nombre: file.name,
    mimeType: file.type || getDataUrlMimeType(dataUrl),
  }));
}

export async function saveSignatureImageFileToSlot(
  file: File,
  slot: 1 | 2,
  storage: Storage = localStorage,
) {
  const key = storageKeyForSlot(slot);
  const dataUrl = await readFileAsDataUrl(file);
  storage.setItem(key, JSON.stringify({
    dataUrl,
    nombre: file.name,
    mimeType: file.type || getDataUrlMimeType(dataUrl),
  }));
}

export function loadStoredSignatureSlot(storage: Storage = localStorage): 1 | 2 {
  const raw = storage.getItem(SIGNATURE_SLOT_KEY);
  if (raw === '2') return 2;
  return 1;
}

export function saveSignatureSlot(slot: 1 | 2, storage: Storage = localStorage) {
  storage.setItem(SIGNATURE_SLOT_KEY, String(slot));
}

/**
 * Migrate legacy `firmaImagen` key into slot 1 if slot 1 is empty and the
 * legacy key exists.  Returns true when a migration happened.
 */
export function migrateLegacySignatureToSlot1(storage: Storage = localStorage): boolean {
  if (storage.getItem(SIGNATURE_IMAGE_KEY_1)) return false;

  const legacyRaw = storage.getItem(SIGNATURE_IMAGE_KEY);
  if (!legacyRaw) return false;

  const image = loadStoredSignatureImage(storage);
  if (!image) return false;

  storage.setItem(SIGNATURE_IMAGE_KEY_1, JSON.stringify({
    dataUrl: image.dataUrl,
    nombre: image.name,
    mimeType: image.mimeType,
  }));
  return true;
}

/** Remove a single slot from storage. */
export function removeStoredSignatureSlot(slot: 1 | 2, storage: Storage = localStorage) {
  storage.removeItem(storageKeyForSlot(slot));
}

/** Check whether a slot has a stored signature. */
export function hasStoredSignatureSlot(slot: 1 | 2, storage: Storage = localStorage): boolean {
  return storage.getItem(storageKeyForSlot(slot)) !== null;
}

export function loadStoredSignatureSize(storage: Storage = localStorage) {
  return storage.getItem(SIGNATURE_SIZE_KEY);
}

export function saveSignatureSize(size: string, storage: Storage = localStorage) {
  storage.setItem(SIGNATURE_SIZE_KEY, size);
}
