'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PostForm from '../../domains/posts/PostForm';
import { fetchPost } from '../../domains/posts/repository';
import { toLocalDatetime } from '../../lib/format';
import type { PostDto } from '@sdarm/types';

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PostDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPost(parseInt(id, 10))
      .then(setPost)
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <div className="state-error">{error}</div>;
  if (!post) return <div className="state-loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h1>Edit post</h1>
      </div>
      <PostForm
        id={post.id}
        initial={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? '',
          body: post.body ?? '',
          author: post.author ?? '',
          publishedAt: toLocalDatetime(post.publishedAt),
          videoUrl: post.videoUrl ?? '',
          coverKey: post.coverKey,
          coverAlt: post.coverAlt ?? '',
          thumbKey: post.thumbKey,
          isFeatured: post.isFeatured,
        }}
      />
    </>
  );
}
