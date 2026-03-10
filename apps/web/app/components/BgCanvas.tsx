'use client';

import { useEffect, useRef } from 'react';

/**
 * Fixed grayscale canvas background — synced with the hero image.
 * Instead of creating a new Image (which fails CORS for external URLs),
 * we grab the already-rendered #heroImg from the DOM — it's already loaded
 * by the browser with no taint issues for canvas drawImage.
 */
export default function BgCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const WARM = 'rgba(216,210,200,';

    function draw() {
      if (!canvas || !ctx) return;
      const img = document.getElementById('heroImg') as HTMLImageElement | null;
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;

      ctx.filter = 'grayscale(100%) contrast(0.65) brightness(1.15)';
      ctx.drawImage(img, 0, 0, W, H);
      ctx.filter = 'none';

      // left fade
      const gl = ctx.createLinearGradient(0, 0, W * 0.22, 0);
      gl.addColorStop(0,   WARM + '1)');
      gl.addColorStop(0.7, WARM + '0.5)');
      gl.addColorStop(1,   WARM + '0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W * 0.22, H);

      // right fade
      const gr = ctx.createLinearGradient(W, 0, W * 0.78, 0);
      gr.addColorStop(0,   WARM + '1)');
      gr.addColorStop(0.7, WARM + '0.5)');
      gr.addColorStop(1,   WARM + '0)');
      ctx.fillStyle = gr;
      ctx.fillRect(W * 0.78, 0, W * 0.22, H);

      // top fade
      const gt = ctx.createLinearGradient(0, 0, 0, H * 0.12);
      gt.addColorStop(0, WARM + '0.7)');
      gt.addColorStop(1, WARM + '0)');
      ctx.fillStyle = gt;
      ctx.fillRect(0, 0, W, H * 0.12);
    }

    // The hero img may not be painted yet when this effect runs.
    // Poll via requestAnimationFrame until it's ready, then draw once.
    let rafId: number;
    function waitForHeroAndDraw() {
      const img = document.getElementById('heroImg') as HTMLImageElement | null;
      if (img && img.complete && img.naturalWidth > 0) {
        draw();
      } else {
        rafId = requestAnimationFrame(waitForHeroAndDraw);
      }
    }
    waitForHeroAndDraw();

    window.addEventListener('resize', draw);
    window.addEventListener('scroll', draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', draw);
      window.removeEventListener('scroll', draw);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="bg-canvas"
      aria-hidden="true"
    />
  );
}
