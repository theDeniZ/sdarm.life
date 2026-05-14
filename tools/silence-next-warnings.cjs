/**
 * Filter the Next.js 16 "middleware → proxy" deprecation warning during
 * `next dev`. The rename is incompatible with @opennextjs/cloudflare (proxy.ts
 * forces Node.js runtime, which opennext rejects at bundle time).
 * Keep middleware.ts until upstream support lands:
 * https://github.com/opennextjs/opennextjs-cloudflare/issues/1213
 */
'use strict';

const SILENCED = /file convention is deprecated.*Please use "proxy"/;

for (const method of ['warn', 'log', 'error']) {
  const original = console[method];
  console[method] = function (...args) {
    if (typeof args[0] === 'string' && SILENCED.test(args[0])) return;
    return original.apply(this, args);
  };
}
