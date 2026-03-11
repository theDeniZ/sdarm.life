'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PostForm from '../../components/PostForm';

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  publishedAt: string | null;
  videoUrl: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  isFeatured: boolean;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sdarm.life';

function toLocalDatetime(iso: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 16);
  return new Date(iso).toISOString().slice(0, 16);
}

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/posts`)
      .then((r) => r.json() as Promise<Post[]>)
      .then((posts) => {
        const found = posts.find((p) => p.id === parseInt(id, 10));
        if (!found) throw new Error('Post not found');
        setPost(found);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <div className="state-error">{error}</div>;
  if (!post)  return <div className="state-loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Edit post</h1>
      </div>
      <PostForm
        id={post.id}
        initial={{
          title:       post.title,
          slug:        post.slug,
          excerpt:     post.excerpt ?? '',
          body:        post.body ?? '',
          author:      post.author ?? '',
          publishedAt: toLocalDatetime(post.publishedAt),
          videoUrl:    post.videoUrl ?? '',
          coverKey:    post.coverKey,
          coverAlt:    post.coverAlt ?? '',
          isFeatured:  post.isFeatured,
        }}
      />
    </>
  );
}
