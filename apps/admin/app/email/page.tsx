import EmailComposer from '../domains/email/EmailComposer';
import DigestPanel from '../domains/email/DigestPanel';

export default function EmailPage() {
  return (
    <>
      <div className="page-header">
        <h1>Email</h1>
      </div>
      <EmailComposer />
      <DigestPanel />
    </>
  );
}
