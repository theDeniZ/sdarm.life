'use client';

import { useEffect, useRef, useState } from 'react';

type Fmt = 'square' | 'story' | 'wide';
type ThemeId = 'dark' | 'vanilla' | 'sand' | 'mahog';

const FORMATS: Record<Fmt, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: '1:1' },
  story: { w: 1080, h: 1920, label: '9:16' },
  wide: { w: 1920, h: 1080, label: '16:9' },
};

const THEMES: Record<ThemeId, { bg1: string; bg2: string; text: string; accent: string; label: string }> = {
  dark: { bg1: '#0c0b09', bg2: '#1a1710', text: '#d6d0c8', accent: '#c9a96e', label: 'Dunkel' },
  vanilla: { bg1: '#f5f0e8', bg2: '#ebe4d4', text: '#2a2318', accent: '#8b6914', label: 'Vanilla' },
  sand: { bg1: '#e8dcc8', bg2: '#d4c4a8', text: '#2a1e0e', accent: '#7a5c1e', label: 'Sand' },
  mahog: { bg1: '#1a0e08', bg2: '#2a1810', text: '#e8d8c0', accent: '#c9845e', label: 'Mahagoni' },
};

function renderCanvas(canvas: HTMLCanvasElement, text: string, ref: string, fmt: Fmt, themeId: ThemeId) {
  const { w, h } = FORMATS[fmt];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const T = THEMES[themeId];
  const cx = w / 2;
  const cy = h / 2;
  const story = fmt === 'story';
  const wide = fmt === 'wide';

  // BG gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, T.bg1);
  grad.addColorStop(1, T.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Radial glow
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
  glow.addColorStop(0, T.accent + '18');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Grain overlay
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);

  // Decorative teardrops
  const dropCount = story ? 6 : wide ? 4 : 5;
  for (let d = 0; d < dropCount; d++) {
    const dx = (w * (d + 0.5)) / dropCount + (Math.random() - 0.5) * w * 0.12;
    const dy = h * 0.08 + (Math.random() - 0.5) * h * 0.04;
    const dr = story ? 180 : wide ? 100 : 130;
    const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr);
    dg.addColorStop(0, T.accent + '22');
    dg.addColorStop(1, 'transparent');
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, w, h);
  }

  // Decorative quote mark
  const qSize = story ? 320 : wide ? 200 : 260;
  ctx.font = `bold ${qSize}px Georgia, serif`;
  ctx.fillStyle = T.accent + '12';
  ctx.textAlign = 'center';
  ctx.fillText('\u201C', cx, cy - (story ? h * 0.15 : h * 0.12));

  // Quote text
  const maxW = w * (wide ? 0.7 : 0.78);
  const fontSize = story ? 68 : wide ? 52 : 62;
  const lineH = story ? 96 : wide ? 74 : 88;
  ctx.font = `italic ${fontSize}px 'Georgia', serif`;
  ctx.fillStyle = T.text;
  ctx.textAlign = 'center';

  // Word-wrap
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const totalTextH = lines.length * lineH;
  const refFontSize = story ? 44 : wide ? 34 : 40;
  const refGap = story ? 52 : wide ? 40 : 48;
  const totalH = totalTextH + refGap + refFontSize;
  let textY = cy - totalH / 2 + lineH * 0.8;

  for (const l of lines) {
    ctx.fillText(l, cx, textY);
    textY += lineH;
  }

  // Reference
  ctx.font = `${refFontSize}px 'Georgia', serif`;
  ctx.fillStyle = T.accent;
  ctx.textAlign = 'center';
  ctx.fillText(`— ${ref}`, cx, textY + refGap * 0.6);

  // Watermark
  const wmSize = story ? 30 : wide ? 24 : 28;
  ctx.font = `${wmSize}px 'Georgia', serif`;
  ctx.fillStyle = T.accent + '55';
  ctx.textAlign = 'center';
  ctx.fillText('SDARM.life', cx, h - (story ? 80 : wide ? 50 : 60));
}

const FMT_ICONS: Record<Fmt, { cls: string; label: string }> = {
  story: { cls: 'qsm-fmt-icon qsm-fmt-icon--story', label: 'Story' },
  square: { cls: 'qsm-fmt-icon qsm-fmt-icon--post', label: 'Post' },
  wide: { cls: 'qsm-fmt-icon qsm-fmt-icon--wide', label: 'Wide' },
};

export default function QuoteShareModal({
  open,
  text,
  ref_,
  onClose,
}: {
  open: boolean;
  text: string;
  ref_: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fmt, setFmt] = useState<Fmt>('square');
  const [theme, setTheme] = useState<ThemeId>('dark');

  useEffect(() => {
    if (open && canvasRef.current) {
      renderCanvas(canvasRef.current, text, ref_, fmt, theme);
    }
  }, [open, text, ref_, fmt, theme]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const download = () => {
    if (!canvasRef.current) return;
    renderCanvas(canvasRef.current, text, ref_, fmt, theme);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
    const a = document.createElement('a');
    a.download = `SDARM.life_${fmt}.jpg`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`qsm-overlay${open ? ' open' : ''}`} onClick={onClose}>
      <div className="qsm-panel" onClick={(e) => e.stopPropagation()}>
        <button className="qsm-close" onClick={onClose} aria-label="Schließen" />

        <div className="qsm-preview-wrap" data-preview-theme={theme}>
          <canvas ref={canvasRef} className="qsm-canvas" />
        </div>

        <div className="qsm-controls">
          <div className="qsm-formats">
            {(Object.keys(FORMATS) as Fmt[]).map((f) => (
              <button key={f} className={`qsm-fmt${fmt === f ? ' active' : ''}`} onClick={() => setFmt(f)}>
                <span className={FMT_ICONS[f].cls} />
                {FMT_ICONS[f].label}
              </button>
            ))}
          </div>
          <div className="qsm-themes">
            {(Object.keys(THEMES) as ThemeId[]).map((t) => (
              <button
                key={t}
                className={`qsm-theme${theme === t ? ' active' : ''}`}
                data-theme={t}
                onClick={() => setTheme(t)}
                title={THEMES[t].label}
              />
            ))}
          </div>
          <button className="qsm-download" onClick={download} aria-label="Als Bild speichern">
            <svg viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
