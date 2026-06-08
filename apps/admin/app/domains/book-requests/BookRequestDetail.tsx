'use client';

import { useEffect, useState } from 'react';
import { fmtDate } from '../../lib/format';
import { fetchBookRequest } from './repository';
import type { BookRequestDto } from './types';

export default function BookRequestDetail({ id }: { id: number }) {
  const [request, setRequest] = useState<BookRequestDto | null | undefined>(undefined);

  useEffect(() => {
    fetchBookRequest(id)
      .then(setRequest)
      .catch(() => setRequest(null));
  }, [id]);

  if (request === undefined) return <div className="state-loading">Loading…</div>;
  if (request === null) return <div className="state-empty">Book request #{id} not found.</div>;

  return (
    <div className="detail-card">
      <table className="detail-table">
        <tbody>
          <Row label="ID" value={String(request.id)} />
          <Row label="Name" value={request.name} />
          <Row label="E-Mail" value={<a href={`mailto:${request.email}`}>{request.email}</a>} />
          <Row label="Phone" value={request.phone ?? '—'} />
          <Row label="Country" value={request.land} />
          <Row label="Street" value={request.street} />
          <Row label="PLZ / City" value={`${request.plz} ${request.city}`} />
          <Row label="Books" value={request.books.join(', ')} />
          <Row label="Wish" value={request.wish ?? '—'} />
          <Row label="Language" value={request.language} />
          <Row label="Submitted" value={fmtDate(request.requestedAt)} />
        </tbody>
      </table>
      <p className="detail-retention-note">This record will be automatically deleted 90 days after submission.</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td className="detail-label">{label}</td>
      <td className="detail-value">{value}</td>
    </tr>
  );
}
