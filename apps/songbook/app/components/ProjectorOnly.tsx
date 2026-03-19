'use client';

import type { SongDto } from '@sdarm/types';
import Projector from './Projector';

export default function ProjectorOnly({ song }: { song: SongDto }) {
  return <Projector song={song} onClose={() => window.close()} isDisplay />;
}
