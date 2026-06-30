export type LoadableImage = {
  naturalWidth: number;
  naturalHeight: number;
  src: string;
  onload: ((event?: Event) => void) | null;
  onerror: ((event?: Event | string) => void) | null;
};

export type ImageConstructor = new () => LoadableImage;

export function loadSignatureAspectRatio(src: string, ImageCtor: ImageConstructor = Image) {
  return new Promise<number>((resolve, reject) => {
    const image = new ImageCtor();
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) {
        resolve(image.naturalWidth / image.naturalHeight);
      } else {
        reject(new Error('Invalid signature image dimensions'));
      }
    };
    image.onerror = () => reject(new Error('The signature image could not be loaded'));
    image.src = src;
  });
}
