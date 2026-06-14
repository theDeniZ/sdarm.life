import ImageLibrary from '../domains/images/ImageLibrary';

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
