import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { ImageResponse } from 'workers-og';
import type { Bindings } from '../types';
import { getPostBySlug } from '../repositories/posts';
import { getSongById } from '../repositories/songs';
import { getTreasureById } from '../repositories/treasures';
import { ogCardHtml } from '../og/card';
// Fonts bundled as ArrayBuffers via the wrangler Data rule. Lexend covers
// Latin (posts, treasures, DE/EN songs); Noto Sans (Cyrillic subset) is the
// fallback so Russian song titles render instead of tofu boxes.
// @ts-expect-error — .ttf import typed by the Data rule, not TS
import lexend400 from '../og/fonts/lexend-400.ttf';
// @ts-expect-error — see above
import lexend600 from '../og/fonts/lexend-600.ttf';
// @ts-expect-error — see above
import noto400 from '../og/fonts/noto-cyrillic-400.ttf';
// @ts-expect-error — see above
import noto600 from '../og/fonts/noto-cyrillic-600.ttf';

// Binary image responder — intentionally outside the OpenAPI spec (same as the
// local-dev R2 proxy), since it returns image/png rather than a JSON contract.
const router = new Hono<{ Bindings: Bindings }>();

const EYEBROW: Record<string, Record<string, string>> = {
  post: { de: 'Beitrag', en: 'Post' },
  song: { de: 'Lied', en: 'Song' },
  treasure: { de: 'Buch', en: 'Book' },
};

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

async function coverDataUrl(env: Bindings, key: string | null): Promise<string | null> {
  if (!key) return null;
  const obj = await env.IMAGES.get(key);
  if (!obj) return null;
  const buf = await obj.arrayBuffer();
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME[ext] ?? 'image/jpeg';
  // btoa needs a binary string; chunk to avoid call-stack limits on large covers
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

router.get('/', async (c) => {
  const type = c.req.query('type');
  const locale = c.req.query('locale') === 'en' ? 'en' : 'de';
  const version = c.req.query('v') ?? '0';
  const db = drizzle(c.env.DB);

  let key: string | null = null;
  let title: string | null = null;
  let subtitle: string | null = null;
  let coverKey: string | null = null;

  if (type === 'post') {
    const slug = c.req.query('slug');
    if (!slug) return c.json({ error: 'Missing slug' }, 400);
    const post = await getPostBySlug(db, slug);
    if (!post || post.deletedAt) return c.json({ error: 'Not found' }, 404);
    key = `post:${slug}`;
    title = post.title;
    subtitle = post.excerpt ?? null;
    coverKey = post.coverKey;
  } else if (type === 'treasure') {
    const id = Number(c.req.query('id'));
    if (!Number.isFinite(id)) return c.json({ error: 'Missing id' }, 400);
    const t = await getTreasureById(db, id);
    if (!t) return c.json({ error: 'Not found' }, 404);
    key = `treasure:${id}`;
    title = t.title;
    subtitle = t.author;
    coverKey = t.coverKey;
  } else if (type === 'song') {
    const id = Number(c.req.query('id'));
    if (!Number.isFinite(id)) return c.json({ error: 'Missing id' }, 400);
    const song = await getSongById(db, id);
    if (!song) return c.json({ error: 'Not found' }, 404);
    key = `song:${id}`;
    title = song.title;
    subtitle = `${song.songbook.title} · ${song.number}`;
    coverKey = null;
  } else {
    return c.json({ error: 'Invalid type' }, 400);
  }

  const cacheKey = `og:${key}:${locale}:${version}`;
  const cached = await c.env.KV.get(cacheKey, 'arrayBuffer');
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'HIT' },
    });
  }

  const html = ogCardHtml({
    eyebrow: EYEBROW[type]![locale],
    title: title!,
    subtitle,
    coverDataUrl: await coverDataUrl(c.env, coverKey),
  });

  const image = new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Lexend', data: lexend400 as ArrayBuffer, weight: 400, style: 'normal' },
      { name: 'Lexend', data: lexend600 as ArrayBuffer, weight: 600, style: 'normal' },
      { name: 'Noto Sans', data: noto400 as ArrayBuffer, weight: 400, style: 'normal' },
      { name: 'Noto Sans', data: noto600 as ArrayBuffer, weight: 600, style: 'normal' },
    ],
  });

  const png = await image.arrayBuffer();
  c.executionCtx.waitUntil(c.env.KV.put(cacheKey, png, { expirationTtl: 60 * 60 * 24 }));

  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'MISS' },
  });
});

export default router;
