'use client';

import Link from 'next/link';
import Image from 'next/image';
import Pagination from '../../components/Pagination';
import { usePaginatedList } from '../../lib/hooks';
import { r2url } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { fetchPosts, deletePost, toggleFeatured, LIMIT } from './repository';
import type { PostListItem } from './types';

export default function PostList() {
  const { items, total, page, loading, setPage, reload } = usePaginatedList<PostListItem>(fetchPosts);

  async function handleToggleFeatured(post: PostListItem) {
    await toggleFeatured(post.id, !post.isFeatured);
    reload();
  }

  async function handleDelete(post: PostListItem) {
    if (!confirm(`Delete "${post.title}"?`)) return;
    await deletePost(post.id);
    reload();
  }

  if (loading) return <div className="state-loading">Loading…</div>;
  if (items.length === 0) return <div className="state-empty">No posts yet.</div>;

  return (
    <>
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
            {items.map((post) => (
              <tr key={post.id}>
                <td>
                  {post.coverKey ? (
                    <Image
                      className="td-thumb"
                      src={r2url(post.coverKey)!}
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
                  <input type="checkbox" checked={post.isFeatured} onChange={() => handleToggleFeatured(post)} />
                </td>
                <td>{post.videoUrl ? '●' : ''}</td>
                <td>
                  <div className="td-actions">
                    <Link href={`/posts/${post.id}`} className="btn-ghost">
                      Edit
                    </Link>
                    <button className="btn-danger" onClick={() => handleDelete(post)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </>
  );
}
