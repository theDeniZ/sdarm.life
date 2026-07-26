import BibleSettings from '../domains/bible/BibleSettings';

export default function BiblePage() {
  return (
    <>
      <div className="page-header">
        <h1>Bible</h1>
      </div>
      <BibleSettings />
    </>
  );
}
