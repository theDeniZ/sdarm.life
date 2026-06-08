import { API, adminHeaders } from '../../lib/api';
import type { BookRequestDto } from './types';

export async function fetchBookRequest(id: number): Promise<BookRequestDto | null> {
  const res = await fetch(`${API}/api/v1/admin/book-requests/${id}`, { headers: adminHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch book request: ${res.status}`);
  return (await res.json()) as BookRequestDto;
}
