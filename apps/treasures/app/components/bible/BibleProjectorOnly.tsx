'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  DEFAULT_PROJECTOR_THEME,
  DEFAULT_SLIDE_OPTIONS,
  MAX_SLIDE_VERSES,
  normalizeTheme,
  PROJECTOR_CHANNEL,
  type HallState,
  type ProjectorMessage,
} from '../../lib/projector';
import ProjectorSlide, { ProjectorFrame, useIsClient } from './ProjectorSlide';

interface Props {
  /**
   * False when any translation in the URL is not licensed for a shared
   * screen. The page decides this from the translation records; the API
   * refuses the same text again (`use=projector`) when the console fetches it.
   */
  allowed: boolean;
}

const INITIAL: HallState = {
  slide: null,
  layout: 'rows',
  theme: DEFAULT_PROJECTOR_THEME,
  scale: 1,
  options: DEFAULT_SLIDE_OPTIONS,
  blank: false,
  frozen: false,
  part: 0,
};

/**
 * A hall state from the channel, which may come from a console tab loaded
 * before the current version: an old theme id maps to its successor, a
 * missing part is the first, and a slide over the verse cap is not shown.
 */
function readHallState(state: HallState): HallState {
  const slide = state.slide && state.slide.rows.length > MAX_SLIDE_VERSES ? null : state.slide;
  return { ...state, slide, theme: normalizeTheme(state.theme), part: state.part ?? 0 };
}

/**
 * The display window (`?projector=1`) — the screen the room sees.
 *
 * It renders nothing of its own choosing: the presenter console sends the
 * whole hall state over the channel and this window draws it. Until the first
 * `sync` arrives it shows the empty stage in the house style. On black-out the
 * stage keeps only its ground and the dimmed wordmark.
 */
export default function BibleProjectorOnly({ allowed }: Props) {
  const t = useTranslations('treasures.bible');
  const mounted = useIsClient();
  const [state, setState] = useState<HallState>(INITIAL);
  const [pendingFullscreen, setPendingFullscreen] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    const ch = new BroadcastChannel(PROJECTOR_CHANNEL);
    const announce = () =>
      ch.postMessage({
        type: 'ready',
        width: window.screen.width,
        height: window.screen.height,
      } satisfies ProjectorMessage);
    ch.onmessage = (e: MessageEvent<ProjectorMessage>) => {
      const msg = e.data;
      if (msg.type === 'sync') setState(readHallState(msg.state));
      else if (msg.type === 'hello') announce();
      else if (msg.type === 'requestFullscreen') setPendingFullscreen(true);
    };
    announce();
    const bye = () => ch.postMessage({ type: 'bye' } satisfies ProjectorMessage);
    window.addEventListener('pagehide', bye);
    return () => {
      window.removeEventListener('pagehide', bye);
      ch.close();
    };
  }, [allowed]);

  const close = useCallback(() => window.close(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!allowed) {
    return (
      <div className="bible-projector-blocked" role="alert">
        <p className="bible-projector-blocked__title">{t('projectorNotAllowedTitle')}</p>
        <p className="bible-projector-blocked__body">{t('projectorNotAllowedBody')}</p>
        <button type="button" className="bible-projector-blocked__close" onClick={close}>
          {t('close')}
        </button>
      </div>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <div className={`bible-display bible-display--${state.theme}`}>
      <ProjectorFrame fit="contain">
        <ProjectorSlide
          slide={state.slide}
          layout={state.layout}
          theme={state.theme}
          scale={state.scale}
          options={state.options}
          part={state.part}
          blank={state.blank}
        />
      </ProjectorFrame>
      {pendingFullscreen && (
        <button
          type="button"
          className="bible-projector__fs-overlay"
          onClick={() => {
            document.documentElement.requestFullscreen?.().catch(() => {});
            setPendingFullscreen(false);
          }}
          aria-label={t('tapForFullscreen')}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('tapForFullscreen')}</span>
        </button>
      )}
    </div>,
    document.body
  );
}
