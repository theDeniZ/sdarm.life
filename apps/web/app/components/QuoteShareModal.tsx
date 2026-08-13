'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

type Fmt = 'story' | 'post' | 'wide';
type ThemeId = 'dark' | 'vanilla' | 'sand' | 'mahog';

interface Theme {
  bg: [string, string, string];
  gr: string;
  ga: number;
  lr: string;
  tc: string;
  rc: string;
  lc: string;
  sc: string;
}

const FORMATS: Record<Fmt, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1080 },
  wide: { w: 1920, h: 1080 },
};

const THEMES: Record<ThemeId, Theme> = {
  dark: {
    bg: ['#1a150e', '#0d0a07', '#161009'],
    gr: '201,169,110',
    ga: 0.08,
    lr: '201,169,110',
    tc: 'rgba(232,220,205,.95)',
    rc: 'rgba(201,169,110,.7)',
    lc: 'rgba(201,169,110,.28)',
    sc: 'rgba(201,169,110,.35)',
  },
  vanilla: {
    bg: ['#f4ece0', '#f1eada', '#ece3d4'],
    gr: '181,158,125',
    ga: 0.07,
    lr: '88,71,56',
    tc: 'rgba(52,33,18,.9)',
    rc: 'rgba(88,71,56,.8)',
    lc: 'rgba(88,71,56,.32)',
    sc: 'rgba(88,71,56,.28)',
  },
  sand: {
    bg: ['#d5c9b2', '#cec1a8', '#c9bba2'],
    gr: '88,71,56',
    ga: 0.08,
    lr: '88,71,56',
    tc: 'rgba(42,26,10,.88)',
    rc: 'rgba(70,52,28,.82)',
    lc: 'rgba(70,52,28,.3)',
    sc: 'rgba(70,52,28,.3)',
  },
  mahog: {
    bg: ['#654e3c', '#584738', '#4e3f31'],
    gr: '206,193,168',
    ga: 0.1,
    lr: '206,193,168',
    tc: 'rgba(241,234,218,.95)',
    rc: 'rgba(206,193,168,.8)',
    lc: 'rgba(206,193,168,.3)',
    sc: 'rgba(206,193,168,.35)',
  },
};

interface WordToken {
  word: string;
  fz: number;
  weight: number;
  color: string;
}

function buildTokens(text: string, baseColor: string, baseFz: number, weight = 400): WordToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ word, fz: baseFz, weight, color: baseColor }));
}

function fontStr(tok: WordToken) {
  return `${tok.weight} ${tok.fz}px "Cormorant Garamond",Georgia,serif`;
}

function wrapTokens(ctx: CanvasRenderingContext2D, tokens: WordToken[], maxW: number): WordToken[][] {
  const lines: WordToken[][] = [];
  let line: WordToken[] = [];
  let lineW = 0;
  for (const tok of tokens) {
    ctx.font = fontStr(tok);
    const spaceW = line.length > 0 ? ctx.measureText(' ').width : 0;
    const wordW = ctx.measureText(tok.word).width;
    if (line.length > 0 && lineW + spaceW + wordW > maxW) {
      lines.push(line);
      line = [tok];
      lineW = wordW;
    } else {
      line.push(tok);
      lineW += spaceW + wordW;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: WordToken[][],
  leftPad: number,
  startY: number,
  lineH: number,
  centered: boolean,
  canvasW: number
) {
  lines.forEach((line, li) => {
    let totalW = 0;
    line.forEach((tok, ti) => {
      ctx.font = fontStr(tok);
      totalW += (ti > 0 ? ctx.measureText(' ').width : 0) + ctx.measureText(tok.word).width;
    });
    let curX = centered ? (canvasW - totalW) / 2 : leftPad;
    const y = startY + li * lineH;
    line.forEach((tok, ti) => {
      ctx.font = fontStr(tok);
      if (ti > 0) curX += ctx.measureText(' ').width;
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.word, curX, y);
      curX += ctx.measureText(tok.word).width;
    });
  });
}

function getGrain(w: number, h: number): HTMLCanvasElement {
  const g = document.createElement('canvas');
  g.width = w;
  g.height = h;
  const gc = g.getContext('2d')!;
  const id = gc.createImageData(w, h);
  const d = id.data;
  const gs = 2;
  for (let y = 0; y < h; y += gs)
    for (let x = 0; x < w; x += gs) {
      const v = (Math.random() * 255) | 0;
      for (let dy = 0; dy < gs && y + dy < h; dy++)
        for (let dx = 0; dx < gs && x + dx < w; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 8;
        }
    }
  gc.putImageData(id, 0, 0);
  return g;
}

function drawTeardrops(ctx: CanvasRenderingContext2D, w: number, h: number, lr: string) {
  const base = Math.min(w, h);
  const r = base * 0.03;
  const dropH = r * 3.6;
  const gap = r * 0.75;
  const x1 = w * 0.1;
  const x2 = x1 + r * 2 + gap;
  const y = h * 0.17;

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = `rgba(${lr},1)`;

  for (const cx of [x1, x2]) {
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.bezierCurveTo(cx + r, y, cx + r, y + r * 1.5, cx, y + dropH);
    ctx.bezierCurveTo(cx - r, y + r * 1.5, cx - r, y, cx, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function renderCanvas(canvas: HTMLCanvasElement, text: string, ref: string, fmt: Fmt, themeId: ThemeId) {
  const { w, h } = FORMATS[fmt];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const T = THEMES[themeId];
  const cx = w / 2,
    cy = h / 2;
  const story = fmt === 'story';
  const wide = fmt === 'wide';

  // 1 — BG gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, T.bg[0]);
  bg.addColorStop(0.5, T.bg[1]);
  bg.addColorStop(1, T.bg[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2 — Radial glow
  const gl = ctx.createRadialGradient(cx, cy * 0.86, 0, cx, cy * 0.86, w * 0.74);
  gl.addColorStop(0, `rgba(${T.gr},${T.ga})`);
  gl.addColorStop(0.65, `rgba(${T.gr},${T.ga * 0.15})`);
  gl.addColorStop(1, 'transparent');
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, w, h);

  // 3 — Paper grain
  ctx.drawImage(getGrain(w, h), 0, 0);

  // 4 — Teardrop quote marks
  drawTeardrops(ctx, w, h, T.lr);

  // 5 — Quote text
  const leftPad = w * 0.1;
  const maxW = w * (wide ? 0.8 : 0.78);
  const baseFz = Math.round(w * (wide ? 0.044 : story ? 0.062 : 0.052));
  const weight = story ? 500 : 400;
  const tokens = buildTokens(text, T.tc, baseFz, weight);
  ctx.textBaseline = 'alphabetic';
  const lines = wrapTokens(ctx, tokens, maxW);
  const lineH = baseFz * 1.38;
  const totalH = lines.length * lineH;
  const startY = cy - totalH / 2 + baseFz * 0.3;
  drawLines(ctx, lines, leftPad, startY, lineH, true, w);

  // 6 — Reference
  const refY = startY + totalH + lineH;
  const rz = Math.round(w * (story ? 0.024 : 0.021));
  ctx.font = `italic 400 ${rz}px "Cormorant Garamond",Georgia,serif`;
  ctx.fillStyle = T.rc;
  ctx.textAlign = 'center';
  ctx.fillText(ref, cx, refY);

  // 7 — SDARM.life watermark
  const ly = story ? h * 0.815 : wide ? h * 0.865 : h * 0.875;
  const lsz = Math.round(w * (wide ? 0.019 : 0.025));
  ctx.font = `400 ${lsz}px "Playfair Display",Georgia,serif`;
  const sw = ctx.measureText('SDARM').width;
  ctx.font = `italic 400 ${lsz}px "Playfair Display",Georgia,serif`;
  const lw2 = ctx.measureText('.life').width;
  const lsx = cx - (sw + lw2) / 2;
  ctx.fillStyle = T.lc;
  ctx.font = `400 ${lsz}px "Playfair Display",Georgia,serif`;
  ctx.textAlign = 'left';
  ctx.fillText('SDARM', lsx, ly);
  ctx.font = `italic 400 ${lsz}px "Playfair Display",Georgia,serif`;
  ctx.fillStyle = T.lc.replace(/[\d.]+\)$/, (m: string) => (parseFloat(m) * 0.65).toFixed(2) + ')');
  ctx.fillText('.life', lsx + sw, ly);
}

interface Props {
  open: boolean;
  text: string;
  ref_: string;
  onClose: () => void;
}

export default function QuoteShareModal({ open, text, ref_, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fmt, setFmt] = useState<Fmt>('story');
  const [theme, setTheme] = useState<ThemeId>('dark');
  const t = useTranslations('web.releases.quote');

  const render = useCallback(() => {
    if (canvasRef.current) renderCanvas(canvasRef.current, text, ref_, fmt, theme);
  }, [text, ref_, fmt, theme]);

  useEffect(() => {
    if (open) document.fonts.ready.then(render);
  }, [open, render]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const download = () => {
    if (!canvasRef.current) return;
    renderCanvas(canvasRef.current, text, ref_, fmt, theme);
    // toDataURL is synchronous — avoids async popup-blocker issues in mobile Safari
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
    const a = document.createElement('a');
    a.download = `SDARM.life_${fmt}.jpg`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`qsm-overlay${open ? ' open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('dialogLabel')}
      aria-hidden={!open}
      inert={!open || undefined}
    >
      <div className="qsm-panel">
        <button className="qsm-close" onClick={onClose} aria-label={t('close')} />

        <div className="qsm-preview-wrap" data-preview-theme={theme}>
          <canvas ref={canvasRef} className="qsm-canvas" />
        </div>

        <div className="qsm-controls">
          <div className="qsm-formats">
            {(['story', 'post', 'wide'] as Fmt[]).map((f) => (
              <button key={f} className={`qsm-fmt${fmt === f ? ' active' : ''}`} onClick={() => setFmt(f)}>
                <span className={`qsm-fmt-icon qsm-fmt-icon--${f}`} />
                <span>{f === 'story' ? 'Story' : f === 'post' ? 'Post' : 'Breit'}</span>
              </button>
            ))}
          </div>

          <div className="qsm-themes">
            {(
              [
                ['dark', 'Dunkel'],
                ['vanilla', 'Vanille'],
                ['sand', 'Sand'],
                ['mahog', 'Mahagoni'],
              ] as [ThemeId, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                className={`qsm-theme${theme === t ? ' active' : ''}`}
                data-theme={t}
                aria-label={label}
                onClick={() => setTheme(t)}
              />
            ))}
          </div>

          <button className="qsm-download" onClick={download} aria-label="Sichern">
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
