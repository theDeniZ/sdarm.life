import { fetchAll } from '../../lib/api';
import { bucketByMonth, lastMonthKeys, monthLabel } from '../../lib/format';
import { fetchSongbooks } from '../songbooks/repository';
import { API, adminHeaders } from '../../lib/api';
import type { SubscriberDto, ImageDto, PostDto, TopSongDto, ListResponse } from '@sdarm/types';

export interface StatisticsData {
  monthLabels: string[];
  audience: {
    monthly: number[];
    total: number;
    confirmed: number;
    pending: number;
    byLanguage: { language: string; count: number }[];
  };
  content: {
    monthly: number[];
    published: number;
    drafts: number;
    featured: number;
    withVideo: number;
  };
  songbooks: { title: string; count: number }[];
  topSongs: TopSongDto[];
  media: {
    monthly: number[];
    total: number;
    totalBytes: number;
  };
}

export async function fetchStatisticsData(): Promise<StatisticsData> {
  const [subsRes, postsRes, songbooks, imagesRes, topSongs] = await Promise.all([
    fetchAll<SubscriberDto>('/api/v1/admin/subscribers'),
    fetchAll<PostDto>('/api/v1/posts'),
    fetchSongbooks(),
    fetchAll<ImageDto>('/api/v1/admin/images'),
    fetchTopSongs(10),
  ]);

  const months = lastMonthKeys(12);

  const byLanguage = new Map<string, number>();
  for (const s of subsRes.items) {
    byLanguage.set(s.language, (byLanguage.get(s.language) ?? 0) + 1);
  }

  const published = postsRes.items.filter((p) => p.publishedAt);

  return {
    monthLabels: months.map(monthLabel),
    audience: {
      monthly: bucketByMonth(
        subsRes.items.map((s) => s.createdAt),
        months
      ),
      total: subsRes.total,
      confirmed: subsRes.items.filter((s) => s.confirmedAt).length,
      pending: subsRes.items.filter((s) => !s.confirmedAt).length,
      byLanguage: Array.from(byLanguage, ([language, count]) => ({ language, count })).sort(
        (a, b) => b.count - a.count
      ),
    },
    content: {
      monthly: bucketByMonth(
        published.map((p) => p.publishedAt!),
        months
      ),
      published: published.length,
      drafts: postsRes.items.length - published.length,
      featured: postsRes.items.filter((p) => p.isFeatured).length,
      withVideo: postsRes.items.filter((p) => p.videoUrl).length,
    },
    songbooks: songbooks.map((b) => ({ title: b.title, count: b.songCount })).sort((a, b) => b.count - a.count),
    topSongs: topSongs.items,
    media: {
      monthly: bucketByMonth(
        imagesRes.items.map((i) => i.uploaded),
        months
      ),
      total: imagesRes.total,
      totalBytes: imagesRes.items.reduce((sum, i) => sum + i.size, 0),
    },
  };
}

// Most-opened songs from the per-song counter (GET /admin/songs/top, issue #197).
async function fetchTopSongs(limit: number): Promise<ListResponse<TopSongDto>> {
  const res = await fetch(`${API}/api/v1/admin/songs/top?limit=${limit}&_t=${Date.now()}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListResponse<TopSongDto>;
}
