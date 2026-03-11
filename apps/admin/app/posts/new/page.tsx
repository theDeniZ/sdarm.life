export const runtime = 'edge';

import PostForm from '../../components/PostForm';

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
