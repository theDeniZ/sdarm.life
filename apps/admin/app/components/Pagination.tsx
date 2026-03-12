'use client';

type Props = {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, total, limit, onChange }: Props) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;

  return (
    <div className="pagination">
      <button className="pagination-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      <span className="pagination-info">
        {page} / {pages} <span className="pagination-total">({total})</span>
      </span>
      <button className="pagination-btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </div>
  );
}
