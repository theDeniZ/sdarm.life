import Link from 'next/link';
import PostList from '../components/PostList';

export default function PostsPage() {
  return (
    <>
      <div className="page-header">
        <h1>Posts</h1>
        <Link href="/posts/new" className="btn-primary">+ New post</Link>
      </div>
      <PostList />
    </>
  );
}
