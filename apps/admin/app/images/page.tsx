export const runtime = 'edge';

import ImageLibrary from '../components/ImageLibrary';

export default function ImagesPage() {
  return (
    <>
      <div className="page-header">
        <h1>Images</h1>
      </div>
      <ImageLibrary />
    </>
  );
}
