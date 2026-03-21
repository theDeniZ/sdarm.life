import { API, adminHeaders } from '../../lib/api';
import type { PostDto, ListResponse } from '@sdarm/types';
import type { PostListItem, PostFormData } from './types';

const LIMIT = 20;

export async function fetchPosts(page: number): Promise<ListResponse<PostListItem>> {
  const offset = (page - 1) * LIMIT;
  const res = await fetch(`${API}/api/v1/posts?limit=${LIMIT}&offset=${offset}&_t=${Date.now()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListResponse<PostListItem>;
}

export async function fetchPost(id: number): Promise<PostDto> {
  const res = await fetch(`${API}/api/v1/admin/posts/${id}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PostDto;
}

export async function createPost(data: PostFormData): Promise<PostDto> {
  const res = await fetch(`${API}/api/v1/admin/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PostDto;
}

export type UpdatePostPayload = Partial<{
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  publishedAt: string | null;
  videoUrl: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  thumbKey: string | null;
  isFeatured: boolean;
}>;

export async function updatePost(id: number, data: UpdatePostPayload): Promise<PostDto> {
  const res = await fetch(`${API}/api/v1/admin/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PostDto;
}

export async function deletePost(id: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/posts/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function toggleFeatured(id: number, value: boolean): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ isFeatured: value }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export { LIMIT };
