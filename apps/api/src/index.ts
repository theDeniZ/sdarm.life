import { Hono } from 'hono';
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
import adminTreasuresRouter from './routes/admin/treasures';
import adminApiKeysRouter from './routes/admin/api-keys';
import treasuresRouter from './routes/treasures';

const app = new OpenAPIHono<{ Bindings: Bindings }>();

app.use(
	'*',
	cors({
		origin: [
			'https://sdarm.life',
			'https://admin.sdarm.life',
			'https://songs.sdarm.life',
			'https://treasures.sdarm.life',
			'http://localhost:3000',
			'http://localhost:3001',
			'http://localhost:3002',
			'http://localhost:3004',
		],
	}),
);

const v1 = new OpenAPIHono<{ Bindings: Bindings }>();
const admin = new OpenAPIHono<{ Bindings: Bindings }>();
const apiKeysApp = new Hono<{ Bindings: Bindings }>();

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

v1.use('/treasures', cached(3600)); // 1 hour — treasure list
v1.use('/treasures/*', cached(3600)); // 1 hour — treasure detail
v1.route('/treasures', treasuresRouter);

// ── Admin routes (auth-gated) ─────────────────────────────────────────────────
admin.use('*', auth);
admin.route('/posts', adminPostsRouter);
admin.route('/config', adminConfigRouter);
admin.route('/images', adminImagesRouter);
admin.route('/subscribers', adminSubscribersRouter);
admin.route('', adminSongbooksRouter);
admin.route('', adminTreasuresRouter);

v1.route('/admin', admin);
app.route('/api/v1', v1);

// ── OpenAPI spec + Swagger UI ─────────────────────────────────────────────────
app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
	type: 'http',
	scheme: 'bearer',
	description: 'API key issued via the admin API Keys management page.',
});

app.doc('/api/openapi.json', {
	openapi: '3.1.0',
	info: { title: 'sdarm.life API', version: '1.0.0' },
});

app.get('/api/ui', swaggerUI({ url: '/api/openapi.json' }));

// ── API Keys route (excluded from Swagger docs) ──────────────────────────────
apiKeysApp.use('*', auth);
apiKeysApp.route('', adminApiKeysRouter);
app.route('/api/v1/admin/api-keys', apiKeysApp);

export default app;
