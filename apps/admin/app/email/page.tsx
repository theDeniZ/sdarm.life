import EmailComposer from '../domains/email/EmailComposer';

export default function EmailPage() {
  return (
    <>
      <div className="page-header">
        <h1>Email</h1>
      </div>
      <EmailComposer />
    </>
  );
}
