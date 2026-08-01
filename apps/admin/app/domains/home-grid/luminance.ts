/**
 * Mean perceived luminance (0–1) of the lower third of an image.
 *
 * Measured here, in the admin, from the local file before it is uploaded —
 * not on the public site. Sampling on the site would mean reading pixels from
 * images.sdarm.life, which needs cross-origin permission, and would repaint the
 * text after the photo loads: a visible flash on every visit. Measuring once at
 * upload and storing the number means the site renders the right colour on the
 * first paint and never touches a canvas.
 *
 * The lower third is what matters because that is where the card puts its text.
 */
export async function measureLuminance(file: File): Promise<number | null> {
  if (typeof document === 'undefined') return null;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    // 64px wide is plenty for an average and keeps this instant on a 4000px
    // original.
    const w = 64;
    const h = Math.max(1, Math.round((img.height / img.width) * w));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    const fromY = Math.floor(h * 0.66);
    const { data } = ctx.getImageData(0, fromY, w, h - fromY);

    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      if (alpha === 0) continue;
      // Rec. 709 luma — matches how the eye weights the channels, so a bright
      // green reads as light and a saturated blue does not.
      sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      count += 1;
    }
    return count === 0 ? null : sum / count;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}
