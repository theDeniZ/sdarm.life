import { API, adminHeaders } from '../../lib/api';
import type { SubscriberDto, ListResponse } from '@sdarm/types';

const LIMIT = 20;

export async function fetchSubscribers(page: number): Promise<ListResponse<SubscriberDto>> {
  const offset = (page - 1) * LIMIT;
  const res = await fetch(
    `${API}/api/v1/admin/subscribers?limit=${LIMIT}&offset=${offset}`,
    { headers: adminHeaders() },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListResponse<SubscriberDto>;
}

export async function deleteSubscriber(id: number): Promise<void> {
  const res = await fetch(`${API}/api/v1/admin/subscribers/${id}`, {
    method:  'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export { LIMIT };
