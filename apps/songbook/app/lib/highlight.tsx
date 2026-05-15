import { Fragment, type ReactNode } from 'react';

export function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  if (!lower.includes(needle)) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let idx = lower.indexOf(needle, cursor);
  let key = 0;
  while (idx !== -1) {
    if (idx > cursor) parts.push(<Fragment key={`t-${key}`}>{text.slice(cursor, idx)}</Fragment>);
    parts.push(<mark key={`m-${key}`}>{text.slice(idx, idx + needle.length)}</mark>);
    cursor = idx + needle.length;
    key += 1;
    idx = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(<Fragment key={`t-${key}`}>{text.slice(cursor)}</Fragment>);
  return parts;
}
