import TreasureForm from '../../domains/treasures/TreasureForm';

export default function NewTreasurePage() {
  return (
    <>
      <div className="page-header">
        <h1>New treasure</h1>
      </div>
      <TreasureForm />
    </>
  );
}
