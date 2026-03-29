'use client';

import { useEffect, useRef, useState } from 'react';

type Fmt = 'square' | 'story' | 'wide' | 'portrait';
type ThemeId = 'wald' | 'nacht' | 'vanilla' | 'sand' | 'duomo';

const FORMATS: Record<Fmt, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: '1:1' },
  portrait: { w: 1080, h: 1350, label: '4:5' },
  story: { w: 1080, h: 1920, label: '9:16' },
  wide: { w: 1920, h: 1080, label: '16:9' },
};

const THEMES: Record<
  ThemeId,
  { bg1: string; bg2: string; text: string; accent: string; label: string; layout?: 'clean' }
> = {
  wald: { bg1: '#283a2a', bg2: '#1e2e20', text: '#e8e0cc', accent: '#c8b07a', label: 'Wald' },
  nacht: { bg1: '#1e2430', bg2: '#161c28', text: '#e0d8c8', accent: '#c9a96e', label: 'Nacht' },
  vanilla: { bg1: '#f5f0e8', bg2: '#ebe4d4', text: '#2a2318', accent: '#8b6914', label: 'Vanilla' },
  sand: { bg1: '#e8dcc8', bg2: '#d4c4a8', text: '#2a1e0e', accent: '#7a5c1e', label: 'Sand' },
  duomo: { bg1: '#b8c8b8', bg2: '#a8bca8', text: '#1e2a1e', accent: '#3a5a3a', label: 'Duomo', layout: 'clean' },
};

function renderCanvas(canvas: HTMLCanvasElement, text: string, ref: string, fmt: Fmt, themeId: ThemeId) {
  const { w, h } = FORMATS[fmt];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const T = THEMES[themeId];
  const cx = w / 2;
  const story = fmt === 'story';
  const wide = fmt === 'wide';
  const portrait = fmt === 'portrait';

  // Background — subtle top-to-bottom gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, T.bg1);
  grad.addColorStop(1, T.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle grain
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);

  const padding = w * 0.13;
  const maxW = w - padding * 2;
  const fontSize = story ? 62 : wide ? 46 : 56;
  const lineH = story ? 88 : wide ? 66 : 80;
  const refFontSize = story ? 40 : wide ? 30 : 36;
  const refGap = story ? 52 : wide ? 40 : 48;
  const wmZone = story ? 160 : wide ? 110 : portrait ? 140 : 130;

  // Word-wrap
  ctx.font = `italic ${fontSize}px Georgia, serif`;
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

  if (T.layout === 'clean') {
    // Duomo layout: reference at top, text centered, no quote mark
    const refTopSize = story ? 36 : wide ? 28 : 32;
    const refTopY = story ? h * 0.1 : wide ? h * 0.18 : h * 0.13;
    ctx.font = `${refTopSize}px Georgia, serif`;
    ctx.fillStyle = T.text;
    ctx.globalAlpha = 0.5;
    ctx.textAlign = 'center';
    ctx.fillText(ref, cx, refTopY);
    ctx.globalAlpha = 1;

    const totalTextH = lines.length * lineH;
    const contentTop = refTopY + refTopSize * 2;
    const contentBottom = h - wmZone;
    let textY = contentTop + (contentBottom - contentTop - totalTextH) / 2 + lineH * 0.8;
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    ctx.fillStyle = T.text;
    ctx.textAlign = 'center';
    for (const l of lines) {
      ctx.fillText(l, cx, textY);
      textY += lineH;
    }
  } else {
    // Classic layout: ❝ at top, text + reference centered
    const qqSize = story ? 210 : wide ? 140 : 170;
    const qqY = story ? h * 0.14 : wide ? h * 0.26 : h * 0.19;
    ctx.font = `bold ${qqSize}px Georgia, serif`;
    ctx.fillStyle = T.accent;
    ctx.globalAlpha = 0.8;
    ctx.textAlign = 'center';
    ctx.fillText('\u201C', cx, qqY);
    ctx.globalAlpha = 1;

    const totalTextH = lines.length * lineH + refGap + refFontSize;
    const contentTop = qqY + qqSize * 0.15;
    const contentBottom = h - wmZone;
    let textY = contentTop + (contentBottom - contentTop - totalTextH) / 2 + lineH * 0.8;
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    ctx.fillStyle = T.text;
    ctx.textAlign = 'center';
    for (const l of lines) {
      ctx.fillText(l, cx, textY);
      textY += lineH;
    }

    // Reference
    ctx.font = `${refFontSize}px Georgia, serif`;
    ctx.fillStyle = T.accent;
    ctx.textAlign = 'center';
    ctx.fillText(`— ${ref}`, cx, textY + refGap * 0.6);
  }

  // Watermark: "SDARM" (Lexend light) + ".life" (Cormorant bold italic) — matches nav logo
  const wmSize = story ? 30 : wide ? 24 : 28;
  const wmY = h - (story ? 80 : wide ? 50 : 60);

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.textAlign = 'left';

  ctx.font = `600 ${wmSize}px Lexend, sans-serif`;
  ctx.letterSpacing = `${wmSize * 0.05}px`;
  ctx.fillStyle = T.text;
  const sdarmW = ctx.measureText('SDARM').width;

  ctx.font = `bold italic ${wmSize}px 'Cormorant Garamond', serif`;
  ctx.letterSpacing = '0px';
  const lifeW = ctx.measureText('.life').width;

  const wmStartX = cx - (sdarmW + lifeW) / 2;

  ctx.font = `600 ${wmSize}px Lexend, sans-serif`;
  ctx.letterSpacing = `${wmSize * 0.05}px`;
  ctx.fillText('SDARM', wmStartX, wmY);

  ctx.font = `bold italic ${wmSize}px 'Cormorant Garamond', serif`;
  ctx.letterSpacing = '0px';
  ctx.fillText('.life', wmStartX + sdarmW, wmY);

  ctx.restore();
}

const FMT_ICONS: Record<Fmt, { cls: string; label: string }> = {
  square: { cls: 'qsm-fmt-icon qsm-fmt-icon--post', label: 'Post' },
  portrait: { cls: 'qsm-fmt-icon qsm-fmt-icon--portrait', label: '4:5' },
  story: { cls: 'qsm-fmt-icon qsm-fmt-icon--story', label: 'Story' },
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
  const [theme, setTheme] = useState<ThemeId>('wald');

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
