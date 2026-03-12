import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings } from './types';
import { auth } from './middleware/auth';
import postsRouter from './routes/posts';
import configRouter from './routes/config';
import imagesRouter from './routes/images';
import subscribersRouter from './routes/subscribers';
import adminPostsRouter from './routes/admin/posts';
import adminConfigRouter from './routes/admin/config';
import adminImagesRouter from './routes/admin/images';
import adminSubscribersRouter from './routes/admin/subscribers';

const app = new Hono<{ Bindings: Bindings }>();

app.use(
	'*',
	cors({
		origin: [
			'https://sdarm.life',
			'https://admin.sdarm.life',
			'http://localhost:3000',
			'http://localhost:3001',
		],
	}),
);

const v1    = new Hono<{ Bindings: Bindings }>();
const admin = new Hono<{ Bindings: Bindings }>();

// ── Public routes ─────────────────────────────────────────────────────────────
v1.route('/posts',  postsRouter);
v1.route('/config', configRouter);
v1.route('/images', imagesRouter);
v1.route('',        subscribersRouter);   // /subscribe + /unsubscribe

// ── Admin routes (auth-gated) ─────────────────────────────────────────────────
admin.use('*', auth);
admin.route('/posts',       adminPostsRouter);
admin.route('/config',      adminConfigRouter);
admin.route('/images',      adminImagesRouter);
admin.route('/subscribers', adminSubscribersRouter);

v1.route('/admin', admin);
app.route('/api/v1', v1);

export default app;
