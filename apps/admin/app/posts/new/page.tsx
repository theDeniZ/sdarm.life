export const runtime = 'edge';

import PostForm from '../../domains/posts/PostForm';

export default function NewPostPage() {
  return (
    <>
      <div className="page-header">
        <h1>New post</h1>
      </div>
      <PostForm />
    </>
  );
}
