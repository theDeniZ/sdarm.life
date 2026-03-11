'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Post = {
  id: number;
  title: string;
  slug: string;
  author: string | null;
  coverKey: string | null;
  isFeatured: boolean;
  videoUrl: string | null;
  publishedAt: string | null;
  deletedAt: string | null;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';
const R2 = process.env.NEXT_PUBLIC_R2_URL ?? 'https://images.sdarm.life';

function adminHeaders(): HeadersInit {
  return {
    'CF-Access-Client-Id': process.env.NEXT_PUBLIC_CF_CLIENT_ID ?? '',
    'CF-Access-Client-Secret': process.env.NEXT_PUBLIC_CF_CLIENT_SECRET ?? '',
  };
}

function fmtDate(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/posts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPosts(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleFeatured(post: Post) {
    await fetch(`${API}/api/v1/admin/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ isFeatured: !post.isFeatured }),
    });
    load();
  }

  async function deletePost(post: Post) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    await fetch(`${API}/api/v1/admin/posts/${post.id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    load();
  }

  if (loading) return <div className="state-loading">Loading…</div>;
  if (error)   return <div className="state-error">{error}</div>;
  if (posts.length === 0) return <div className="state-empty">No posts yet.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cover</th>
            <th>Title</th>
            <th>Author</th>
            <th>Published</th>
            <th>Featured</th>
            <th>Video</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>
                {post.coverKey ? (
                  <Image
                    className="td-thumb"
                    src={`${R2}/${post.coverKey}`}
                    alt={post.title}
                    width={40}
                    height={40}
                    unoptimized
                  />
                ) : (
                  <div className="td-thumb" />
                )}
              </td>
              <td>
                <div className="td-title">{post.title}</div>
                <div className="td-slug">{post.slug}</div>
              </td>
              <td>{post.author ?? '—'}</td>
              <td>{fmtDate(post.publishedAt)}</td>
              <td>
                <input
                  type="checkbox"
                  checked={post.isFeatured}
                  onChange={() => toggleFeatured(post)}
                />
              </td>
              <td>{post.videoUrl ? '●' : ''}</td>
              <td>
                <div className="td-actions">
                  <Link href={`/posts/${post.id}`} className="btn-ghost">
                    Edit
                  </Link>
                  <button className="btn-danger" onClick={() => deletePost(post)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
