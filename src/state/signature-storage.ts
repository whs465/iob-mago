const SIGNATURE_IMAGE_KEY = 'firmaImagen';
const SIGNATURE_SIZE_KEY = 'firmaTamano';

export type StoredSignatureImage = {
  dataUrl: string;
  name: string;
  bytes: ArrayBuffer;
};

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
    const parsedValue = JSON.parse(storedValue) as { dataUrl?: unknown; nombre?: unknown; name?: unknown };
    if (typeof parsedValue.dataUrl !== 'string') throw new Error('Missing stored signature data URL.');
    const name = typeof parsedValue.nombre === 'string'
      ? parsedValue.nombre
      : typeof parsedValue.name === 'string'
        ? parsedValue.name
        : '';

    return {
      dataUrl: parsedValue.dataUrl,
      name,
      bytes: dataUrlToArrayBuffer(parsedValue.dataUrl),
    };
  } catch (error) {
    storage.removeItem(SIGNATURE_IMAGE_KEY);
    return null;
  }
}

export async function saveSignatureImageFile(file: File, storage: Storage = localStorage) {
  const dataUrl = await readFileAsDataUrl(file);
  storage.setItem(SIGNATURE_IMAGE_KEY, JSON.stringify({
    dataUrl,
    nombre: file.name,
  }));
}

export function loadStoredSignatureSize(storage: Storage = localStorage) {
  return storage.getItem(SIGNATURE_SIZE_KEY);
}

export function saveSignatureSize(size: string, storage: Storage = localStorage) {
  storage.setItem(SIGNATURE_SIZE_KEY, size);
}
