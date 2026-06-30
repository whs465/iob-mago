export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function recolorCanvasPixels(canvas: HTMLCanvasElement, rgb: RgbColor) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = rgb.r;
    pixels[i + 1] = rgb.g;
    pixels[i + 2] = rgb.b;
  }

  context.putImageData(imageData, 0, 0);
}
