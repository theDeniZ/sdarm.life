import type { CSSProperties } from 'react';
import type { AlignedLine, LinePart, LineStep } from '@/app/lib/line-mode';
import type { Transition } from '@/app/lib/use-line-mode';

/** Lines with their translation underneath — the current layer, and the presenter's previews. */
export function LineText({ lines, subStyle }: { lines: AlignedLine[]; subStyle: LinePart['subStyle'] }) {
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="line-stage__line">
          <div className="line-stage__main">{line.text}</div>
          {line.sub.map((sub, j) => (
            <div key={j} className={`line-stage__sub line-stage__sub--${subStyle}`}>
              {sub}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

const linesOf = (part: LinePart, step: LineStep | undefined) =>
  step ? part.lines.slice(step.lineIndex, step.lineIndex + step.count) : [];

interface Props {
  part: LinePart;
  steps: LineStep[];
  stepIndex: number;
  transition: Transition;
  direction: 1 | -1;
}

/**
 * Three layers: the line just sung (dimmed, above), the current line with its
 * translation, and the next line as a faint preview below. The neighbours stay
 * inside the part — a verse's last line does not lead into the chorus text.
 *
 * The parent keys this by step, so every move remounts it and the entry
 * animation plays in the direction of travel.
 */
export default function LineStage({ part, steps, stepIndex, transition, direction }: Props) {
  const step = steps[stepIndex];
  const before = steps[stepIndex - 1];
  const after = steps[stepIndex + 1];
  const previous = before?.partIndex === step.partIndex ? linesOf(part, before) : [];
  const upcoming = after?.partIndex === step.partIndex ? linesOf(part, after) : [];

  return (
    <div
      className={`line-stage line-stage--${transition.style}`}
      data-direction={direction > 0 ? 'forward' : 'back'}
      style={{ '--line-duration': `${transition.durationMs}ms` } as CSSProperties}
    >
      <div className="line-stage__prev" aria-hidden="true">
        {previous.map((line, i) => (
          <div key={i}>{line.text}</div>
        ))}
      </div>
      <div className="line-stage__current">
        <LineText lines={linesOf(part, step)} subStyle={part.subStyle} />
      </div>
      <div className="line-stage__next" aria-hidden="true">
        {upcoming.map((line, i) => (
          <div key={i}>{line.text}</div>
        ))}
      </div>
    </div>
  );
}
