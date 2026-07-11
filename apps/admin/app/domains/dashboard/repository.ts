import { API, adminHeaders } from '../../lib/api';
import { fetchSongbooks } from '../songbooks/repository';
import type { PostListItem } from '../posts/types';
import type { SubscriberDto, ListResponse } from '@sdarm/types';

interface TreasureSummary {
  isFree: boolean;
}

interface ImageSummary {
  size: number;
}

// Dashboard aggregates need the full dataset, not just one paginated page —
// fetchPosts()/fetchSubscribers() hardcode a 20-item page. Page through the
// endpoint directly instead so counts (e.g. "free treasures") are accurate
// regardless of how many rows exist, not silently truncated at a fixed cap.
async function fetchAll<T>(path: string): Promise<ListResponse<T>> {
  const pageSize = 500;
  const items: T[] = [];
  const sep = path.includes('?') ? '&' : '?';
  let offset = 0;
  while (true) {
    const res = await fetch(`${API}${path}${sep}limit=${pageSize}&offset=${offset}&_t=${Date.now()}`, {
      headers: adminHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = (await res.json()) as ListResponse<T>;
    items.push(...page.items);
    offset += pageSize;
    if (page.items.length === 0 || offset >= page.total) return { items, total: page.total };
  }
}

export interface DashboardData {
  posts: {
    latest: PostListItem[];
    total: number;
    thisMonth: number;
    lastMonth: number;
    featured: number;
    withVideo: number;
    monthlyCounts: number[];
  };
  subscribers: {
    latest: SubscriberDto[];
    total: number;
    confirmed: number;
  };
  songs: {
    total: number;
    songbookCount: number;
  };
  treasures: {
    total: number;
    free: number;
  };
  images: {
    total: number;
    totalBytes: number;
  };
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [postsRes, subsRes, songbooks, treasuresRes, imagesRes] = await Promise.all([
    fetchAll<PostListItem>('/api/v1/posts'),
    fetchAll<SubscriberDto>('/api/v1/admin/subscribers'),
    fetchSongbooks(),
    fetchAll<TreasureSummary>('/api/v1/admin/treasures'),
    fetchAll<ImageSummary>('/api/v1/admin/images'),
  ]);

  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const thisMonthKey = months[11];
  const lastMonthKey = months[10];

  const published = postsRes.items.filter((p) => p.publishedAt);
  const countsByMonth = new Map<string, number>();
  for (const p of published) {
    const key = monthKey(p.publishedAt!);
    countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
  }

  return {
    posts: {
      latest: postsRes.items.slice(0, 5),
      total: postsRes.total,
      thisMonth: countsByMonth.get(thisMonthKey) ?? 0,
      lastMonth: countsByMonth.get(lastMonthKey) ?? 0,
      featured: postsRes.items.filter((p) => p.isFeatured).length,
      withVideo: postsRes.items.filter((p) => p.videoUrl).length,
      monthlyCounts: months.map((m) => countsByMonth.get(m) ?? 0),
    },
    subscribers: {
      latest: subsRes.items.slice(0, 5),
      total: subsRes.total,
      confirmed: subsRes.items.filter((s) => s.confirmedAt).length,
    },
    songs: {
      total: songbooks.reduce((sum, b) => sum + b.songCount, 0),
      songbookCount: songbooks.length,
    },
    treasures: {
      total: treasuresRes.total,
      free: treasuresRes.items.filter((t) => t.isFree).length,
    },
    images: {
      total: imagesRes.total,
      totalBytes: imagesRes.items.reduce((sum, i) => sum + i.size, 0),
    },
  };
}
