'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SongDto } from '@sdarm/types';
import { expandParts } from './format';
import {
  buildLineParts,
  buildSteps,
  findStep,
  partsInLanguage,
  snapLine,
  songLanguages,
  type LinesPerSlide,
  type TransitionStyle,
} from './line-mode';

export interface Transition {
  style: TransitionStyle;
  durationMs: number;
}

export const TRANSITION_SPEEDS = [200, 400, 800] as const;
const DEFAULT_TRANSITION: Transition = { style: 'slide', durationMs: 400 };

/** The BroadcastChannel messages line mode adds (issue #61). */
export type LineMessage =
  | { type: 'lineIndex'; partIndex: number; lineIndex: number }
  | { type: 'lineMode'; active: boolean; linesPerSlide: LinesPerSlide }
  | { type: 'primaryLang'; lang: string }
  | { type: 'secondaryLang'; lang: string | null }
  | { type: 'blank'; active: boolean }
  | { type: 'transition'; style: TransitionStyle; durationMs: number };

interface Options {
  song: SongDto;
  /** The full-verse slide number, owned by the component as before. */
  index: number;
  setIndex: (update: number | ((i: number) => number)) => void;
  /** Sets the slide number from a message without echoing a `slide` back. */
  setIndexFromRemote: (i: number) => void;
  post: (message: LineMessage) => void;
}

/**
 * Line-by-line state shared by the projector display and the presenter
 * dashboard. Every setter applies the change locally and, unless it came in
 * over the channel, broadcasts it — both windows run the same pure functions,
 * so only positions and settings travel, never text.
 */
export function useLineMode({ song, index, setIndex, setIndexFromRemote, post }: Options) {
  const bookLanguage = song.songbook.language;
  const languages = useMemo(() => songLanguages(song.parts, bookLanguage), [song.parts, bookLanguage]);

  const [active, setActive] = useState(false);
  const [linesPerSlide, setLinesPerSlide] = useState<LinesPerSlide>(1);
  const [lineIndex, setLineIndex] = useState(0);
  const [primaryLang, setPrimaryLang] = useState(languages[0]);
  const [secondaryLang, setSecondaryLang] = useState<string | null>(languages[1] ?? null);
  const [blank, setBlank] = useState(false);
  const [transition, setTransition] = useState<Transition>(DEFAULT_TRANSITION);

  // Full-verse slides show the primary language only. For a song without
  // translations that is every part, exactly as before.
  const parts = useMemo(
    () => expandParts(partsInLanguage(song.parts, primaryLang, bookLanguage)),
    [song.parts, primaryLang, bookLanguage]
  );
  const lineParts = useMemo(
    () => buildLineParts(song.parts, bookLanguage, primaryLang, secondaryLang),
    [song.parts, bookLanguage, primaryLang, secondaryLang]
  );
  const steps = useMemo(() => buildSteps(lineParts, linesPerSlide), [lineParts, linesPerSlide]);
  const stepIndex = findStep(steps, index, lineIndex);

  // Which way the last move went, so the text slides the matching direction.
  // Adjusted during render (React's pattern for state derived from a change).
  const [lastStep, setLastStep] = useState(stepIndex);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (stepIndex !== lastStep) {
    setLastStep(stepIndex);
    setDirection(stepIndex > lastStep ? 1 : -1);
  }

  const resetLine = useCallback(() => setLineIndex(0), []);

  const applyLineMode = useCallback(
    (on: boolean, perSlide: LinesPerSlide, broadcast: boolean) => {
      setActive(on);
      setLinesPerSlide(perSlide);
      setLineIndex((l) => snapLine(l, perSlide));
      if (broadcast) post({ type: 'lineMode', active: on, linesPerSlide: perSlide });
    },
    [post]
  );

  const goToStep = useCallback(
    (i: number) => {
      const step = steps[i];
      if (!step) return;
      setIndex(step.partIndex);
      setLineIndex(step.lineIndex);
      post({ type: 'lineIndex', partIndex: step.partIndex, lineIndex: step.lineIndex });
    },
    [steps, setIndex, post]
  );
  const nextStep = useCallback(() => goToStep(stepIndex + 1), [goToStep, stepIndex]);
  const prevStep = useCallback(() => goToStep(stepIndex - 1), [goToStep, stepIndex]);

  const applyLanguages = useCallback(
    (primary: string, secondary: string | null, broadcast: boolean) => {
      setPrimaryLang(primary);
      setSecondaryLang(secondary === primary ? null : secondary);
      // A translation may have fewer parts; stay on the last one rather than
      // pointing past the end. The line is clamped by findStep().
      const count = expandParts(partsInLanguage(song.parts, primary, bookLanguage)).length;
      setIndex((i) => Math.min(i, count + 1));
      if (broadcast) {
        post({ type: 'primaryLang', lang: primary });
        post({ type: 'secondaryLang', lang: secondary === primary ? null : secondary });
      }
    },
    [song.parts, bookLanguage, setIndex, post]
  );

  const applyBlank = useCallback(
    (on: boolean, broadcast: boolean) => {
      setBlank(on);
      if (broadcast) post({ type: 'blank', active: on });
    },
    [post]
  );

  const applyTransition = useCallback(
    (next: Transition, broadcast: boolean) => {
      setTransition(next);
      if (broadcast) post({ type: 'transition', ...next });
    },
    [post]
  );

  /** Applies a line-mode message from the other window; false if it is not one. */
  const receive = useCallback(
    (data: { type?: string } & Record<string, unknown>): boolean => {
      const msg = data as LineMessage;
      switch (msg.type) {
        case 'lineIndex':
          setIndexFromRemote(msg.partIndex);
          setLineIndex(msg.lineIndex);
          return true;
        case 'lineMode':
          applyLineMode(msg.active, msg.linesPerSlide, false);
          return true;
        case 'primaryLang':
          setPrimaryLang(msg.lang);
          return true;
        case 'secondaryLang':
          setSecondaryLang(msg.lang);
          return true;
        case 'blank':
          setBlank(msg.active);
          return true;
        case 'transition':
          setTransition({ style: msg.style, durationMs: msg.durationMs });
          return true;
        default:
          return false;
      }
    },
    [setIndexFromRemote, applyLineMode]
  );

  /** Everything a freshly opened display needs, in an order that applies cleanly. */
  const snapshot = useCallback(
    (): LineMessage[] => [
      { type: 'lineMode', active, linesPerSlide },
      { type: 'primaryLang', lang: primaryLang },
      { type: 'secondaryLang', lang: secondaryLang },
      { type: 'transition', ...transition },
      { type: 'blank', active: blank },
      { type: 'lineIndex', partIndex: index, lineIndex },
    ],
    [active, linesPerSlide, primaryLang, secondaryLang, transition, blank, index, lineIndex]
  );

  return {
    languages,
    active,
    linesPerSlide,
    lineIndex,
    primaryLang,
    secondaryLang,
    blank,
    transition,
    direction,
    parts,
    lineParts,
    steps,
    stepIndex,
    resetLine,
    nextStep,
    prevStep,
    setLineMode: (on: boolean, perSlide: LinesPerSlide = linesPerSlide) => applyLineMode(on, perSlide, true),
    setLanguages: (primary: string, secondary: string | null) => applyLanguages(primary, secondary, true),
    swapLanguages: () => secondaryLang && applyLanguages(secondaryLang, primaryLang, true),
    setBlank: (on: boolean) => applyBlank(on, true),
    setTransition: (next: Transition) => applyTransition(next, true),
    receive,
    snapshot,
  };
}
