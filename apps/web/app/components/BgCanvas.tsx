'use client';

import { useEffect, useRef } from 'react';

interface BgCanvasProps {
  bgImageUrl?: string | null;
}

/**
 * Fixed grayscale canvas background.
 * If bgImageUrl is provided (from hero_bg_key config), it loads that image.
 * Otherwise falls back to grabbing the already-rendered #heroImg from the DOM.
 */
export default function BgCanvas({ bgImageUrl }: BgCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const WARM = 'rgba(216,210,200,';

    function draw(img: HTMLImageElement) {
      if (!canvas || !ctx) return;

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

    let rafId: number;
    let resizeImg: HTMLImageElement | null = null;

    if (bgImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        draw(img);
        resizeImg = img;
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onResize);
      };
      img.src = bgImageUrl;
    } else {
      // Fallback: poll for #heroImg already rendered in the DOM
      function waitForHeroAndDraw() {
        const img = document.getElementById('heroImg') as HTMLImageElement | null;
        if (img && img.complete && img.naturalWidth > 0) {
          draw(img);
          resizeImg = img;
          window.addEventListener('resize', onResize);
          window.addEventListener('scroll', onResize);
        } else {
          rafId = requestAnimationFrame(waitForHeroAndDraw);
        }
      }
      waitForHeroAndDraw();
    }

    function onResize() {
      if (resizeImg) draw(resizeImg);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize);
    };
  }, [bgImageUrl]);

  return (
    <canvas
      ref={canvasRef}
      id="bg-canvas"
      aria-hidden="true"
    />
  );
}
