import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import type { Bindings } from './types';
import { auth } from './middleware/auth';
import { cached } from './middleware/cache';
import postsRouter from './routes/posts';
import configRouter from './routes/config';
import imagesRouter from './routes/images';
import subscribersRouter from './routes/subscribers';
import songbooksRouter from './routes/songbooks';
import songsRouter from './routes/songs';
import adminPostsRouter from './routes/admin/posts';
import adminConfigRouter from './routes/admin/config';
import adminImagesRouter from './routes/admin/images';
import adminSubscribersRouter from './routes/admin/subscribers';
import adminSongbooksRouter from './routes/admin/songbooks';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

app.use(
	'*',
	cors({
		origin: ['https://sdarm.life', 'https://admin.sdarm.life', 'https://songs.sdarm.life', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
	}),
);

const v1 = new OpenAPIHono<{ Bindings: Bindings }>();
const admin = new OpenAPIHono<{ Bindings: Bindings }>();

// ── Public routes (with caching) ─────────────────────────────────────────────
v1.use('/posts', cached(300)); // 5 min — post lists
v1.use('/posts/*', cached(3600)); // 1 hour — individual posts
v1.route('/posts', postsRouter);

v1.route('/config', configRouter); // No cache — handled by KV
v1.route('/images', imagesRouter);
v1.route('', subscribersRouter); // /subscribe + /unsubscribe

v1.use('/songbooks', cached(3600)); // 1 hour — songbook list
v1.use('/songbooks/*', cached(3600)); // 1 hour — songbook detail + songs
v1.route('/songbooks', songbooksRouter);

v1.use('/songs/*', cached(3600)); // 1 hour — individual songs
v1.route('/songs', songsRouter);

// ── Admin routes (auth-gated) ─────────────────────────────────────────────────
admin.use('*', auth);
admin.route('/posts', adminPostsRouter);
admin.route('/config', adminConfigRouter);
admin.route('/images', adminImagesRouter);
admin.route('/subscribers', adminSubscribersRouter);
admin.route('', adminSongbooksRouter);

v1.route('/admin', admin);
app.route('/api/v1', v1);

// ── OpenAPI spec + Swagger UI ─────────────────────────────────────────────────
app.openAPIRegistry.registerComponent('securitySchemes', 'cfAccess', {
	type: 'apiKey',
	in: 'header',
	name: 'CF-Access-Client-Id',
	description: 'Cloudflare Access Client ID. Also requires CF-Access-Client-Secret header.',
});

app.doc('/api/openapi.json', {
	openapi: '3.1.0',
	info: { title: 'sdarm.life API', version: '1.0.0' },
});

app.get('/api/ui', swaggerUI({ url: '/api/openapi.json' }));

export default app;
