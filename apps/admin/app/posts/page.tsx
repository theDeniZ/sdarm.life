export const runtime = 'edge';

import Link from 'next/link';
import PostList from '../domains/posts/PostList';

export default function PostsPage() {
  return (
    <>
      <div className="page-header">
        <h1>Posts</h1>
        <Link href="/posts/new" className="btn-primary">
          + New post
        </Link>
      </div>
      <PostList />
    </>
  );
}
