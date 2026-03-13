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

export const songbooks = sqliteTable('songbooks', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  title:       text('title').notNull(),
  slug:        text('slug').notNull().unique(),
  language:    text('language').notNull().default('ru'),
  description: text('description'),
  coverKey:    text('cover_key'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const songs = sqliteTable('songs', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  songbookId: integer('songbook_id').notNull().references(() => songbooks.id),
  number:     integer('number').notNull(),
  title:      text('title').notNull(),
  author:     text('author'),
  copyright:  text('copyright'),
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt:  integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const songParts = sqliteTable('song_parts', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  songId:    integer('song_id').notNull().references(() => songs.id),
  type:      text('type', { enum: ['verse', 'chorus', 'bridge', 'intro', 'outro', 'coda'] }).notNull(),
  label:     text('label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  lyrics:    text('lyrics').notNull().default(''),
});

export const songSheets = sqliteTable('song_sheets', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  songId:     integer('song_id').notNull().references(() => songs.id),
  key:        text('key').notNull(),
  type:       text('type', { enum: ['pdf', 'image'] }).notNull(),
  sortOrder:  integer('sort_order').notNull().default(0),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
