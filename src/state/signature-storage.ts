const SIGNATURE_IMAGE_KEY = 'firmaImagen';
const SIGNATURE_SIZE_KEY = 'firmaTamano';

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

export function loadStoredSignatureImage(storage: Storage = localStorage): StoredSignatureImage | null {
  const storedValue = storage.getItem(SIGNATURE_IMAGE_KEY);
  if (!storedValue) return null;

  try {
    const parsedValue = JSON.parse(storedValue) as StoredSignatureImageRecord;
    if (typeof parsedValue.dataUrl !== 'string') throw new Error('Missing stored signature data URL.');
    const name = typeof parsedValue.nombre === 'string'
      ? parsedValue.nombre
      : typeof parsedValue.name === 'string'
        ? parsedValue.name
        : '';
    const mimeType = typeof parsedValue.mimeType === 'string'
      ? parsedValue.mimeType.toLowerCase()
      : getDataUrlMimeType(parsedValue.dataUrl);

    return {
      dataUrl: parsedValue.dataUrl,
      name,
      bytes: dataUrlToArrayBuffer(parsedValue.dataUrl),
      mimeType,
    };
  } catch (error) {
    storage.removeItem(SIGNATURE_IMAGE_KEY);
    return null;
  }
}

export async function saveSignatureImageFile(file: File, storage: Storage = localStorage) {
  const dataUrl = await readFileAsDataUrl(file);
  const serializedValue = JSON.stringify({
    dataUrl,
    nombre: file.name,
    mimeType: file.type || getDataUrlMimeType(dataUrl),
  });

  storage.setItem(SIGNATURE_IMAGE_KEY, serializedValue);

  if (storage.getItem(SIGNATURE_IMAGE_KEY) !== serializedValue) {
    throw new Error('The signature image could not be persisted in local storage.');
  }
}

export function loadStoredSignatureSize(storage: Storage = localStorage) {
  return storage.getItem(SIGNATURE_SIZE_KEY);
}

export function saveSignatureSize(size: string, storage: Storage = localStorage) {
  storage.setItem(SIGNATURE_SIZE_KEY, size);
}
