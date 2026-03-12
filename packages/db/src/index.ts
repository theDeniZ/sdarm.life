import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const KNOWN_CONFIG_KEYS = [
  'donation_url',
  'hero_bg_key',
  'hero_bg_alt',
  'about_text_1',
  'about_text_2',
  'about_image_key',
  'about_image_alt',
  'about_link_url',
  'facebook_url',
  'whatsapp_url',
  'instagram_url',
  'youtube_url',
] as const;

export type ConfigKey = typeof KNOWN_CONFIG_KEYS[number];

export const posts = sqliteTable('posts', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  title:       text('title').notNull(),
  slug:        text('slug').notNull().unique(),
  excerpt:     text('excerpt'),
  body:        text('body'),
  author:      text('author'),
  videoUrl:    text('video_url'),
  coverKey:    text('cover_key'),
  coverAlt:    text('cover_alt'),
  thumbKey:    text('thumb_key'),
  isFeatured:  integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt:   integer('created_at',  { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt:   integer('updated_at',  { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  deletedAt:   integer('deleted_at',  { mode: 'timestamp' }),
});

export const siteConfig = sqliteTable('site_config', {
  key:       text('key').primaryKey(),
  value:     text('value'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const images = sqliteTable('images', {
  key:        text('key').primaryKey(),
  size:       integer('size').notNull(),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const subscribers = sqliteTable('subscribers', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  email:          text('email').notNull().unique(),
  token:          text('token').notNull().unique(),
  unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp' }),
  createdAt:      integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
