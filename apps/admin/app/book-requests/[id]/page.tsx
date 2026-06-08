import BookRequestDetail from '../../domains/book-requests/BookRequestDetail';

export default async function BookRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <div className="page-header">
        <h1>Book Request #{id}</h1>
      </div>
      <BookRequestDetail id={Number(id)} />
    </>
  );
}
