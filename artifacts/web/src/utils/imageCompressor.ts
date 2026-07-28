/**
 * Compresses an image file using HTML Canvas.
 * Default max width/height is 1600x1200, which keeps high quality while reducing resolution.
 * Converts PNG/JPEG to a compressed JPEG format (quality 0.8) to significantly reduce size.
 * Keep original for SVG and GIF to prevent animation loss or rendering issues.
 */
export function compressImage(file: File, maxWidth = 1600, maxHeight = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const isSvgOrGif = file.type === 'image/svg+xml' || file.type === 'image/gif';
      if (isSvgOrGif) {
        resolve(e.target?.result as string);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Default to image/jpeg for highest compression efficiency on photographs/screenshots
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}
