import { fetchAll } from '../../lib/api';
import { bucketByMonth, lastMonthKeys } from '../../lib/format';
import { fetchSongbooks } from '../songbooks/repository';
import type { PostListItem } from '../posts/types';
import type { SubscriberDto } from '@sdarm/types';

interface TreasureSummary {
  isFree: boolean;
}

interface ImageSummary {
  size: number;
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

export async function fetchDashboardData(): Promise<DashboardData> {
  const [postsRes, subsRes, songbooks, treasuresRes, imagesRes] = await Promise.all([
    fetchAll<PostListItem>('/api/v1/posts'),
    fetchAll<SubscriberDto>('/api/v1/admin/subscribers'),
    fetchSongbooks(),
    fetchAll<TreasureSummary>('/api/v1/admin/treasures'),
    fetchAll<ImageSummary>('/api/v1/admin/images'),
  ]);

  const months = lastMonthKeys(12);
  const publishedDates = postsRes.items.filter((p) => p.publishedAt).map((p) => p.publishedAt!);
  const monthlyCounts = bucketByMonth(publishedDates, months);

  return {
    posts: {
      latest: postsRes.items.slice(0, 5),
      total: postsRes.total,
      thisMonth: monthlyCounts[11],
      lastMonth: monthlyCounts[10],
      featured: postsRes.items.filter((p) => p.isFeatured).length,
      withVideo: postsRes.items.filter((p) => p.videoUrl).length,
      monthlyCounts,
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
