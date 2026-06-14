// Server-side proxy — forwards admin API calls to sdarm-api with a server-only
// bearer token. Keeps API_KEY out of the browser bundle entirely. Cloudflare
// Access still gates admin.sdarm.life, so only authorised operators reach here.

const API_BASE = process.env.API_URL ?? 'https://api.sdarm.life';

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url, 'http://localhost');
  const target = `${API_BASE}/api/v1/${path.join('/')}${url.search}`;

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Server misconfigured: API_KEY not set' }, { status: 500 });
  }

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.set('Authorization', `Bearer ${apiKey}`);

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    redirect: 'manual',
  };
  // Streaming request bodies (e.g. multipart/form-data for image uploads)
  // require duplex:half on fetch — a runtime-level quirk, not a TS type.
  if (init.body) init.duplex = 'half';

  const upstream = await fetch(target, init);
  // Node's fetch auto-decompresses the body, so forwarding the upstream's
  // Content-Encoding header would tell the browser to decode plaintext as gzip.
  // Wrangler dev advertises gzip on GET responses, which triggers this.
  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete('content-encoding');
  resHeaders.delete('content-length');
  resHeaders.delete('transfer-encoding');
  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as HEAD, proxy as OPTIONS };
