'use client';

import Link from 'next/link';

/**
 * A section of Schätze standing in the shelf of books: the Bible, and the
 * Sabbath Bible Lesson on its own host.
 *
 * They are cards like every other card — same shape, same shelf, same reveal —
 * because that is where a reader looks for something to read. What sets them
 * apart is a tint of paper behind them and a drawn mark instead of a cover:
 * enough to say "this one is not a book you receive, it is a room you enter",
 * not so much that the shelf stops reading as one shelf.
 *
 * They are pinned ahead of the books and take no part in the filters or the
 * paging — a section does not have a language or a price to filter by, and it
 * should not fall onto page three.
 */
export default function SectionCard({
  href,
  title,
  description,
  tone,
  mark,
  external = false,
}: {
  href: string;
  title: string;
  description: string;
  tone: 'bible' | 'sbl';
  mark: React.ReactNode;
  /** The destination is another site (sbl.sdarm.life), so this leaves the app.
   *  `next/link` is for routes within it; a plain anchor is what an address on
   *  another host wants, and it keeps Next from prefetching a page it does not
   *  own. */
  external?: boolean;
}) {
  const className = `item-card item-card--section item-card--${tone}`;
  const body = (
    <>
      <div className="item-visual section-visual">{mark}</div>
      <div className="item-body">
        <div className="item-title-row">
          <div className="item-title">{title}</div>
        </div>
        <div className="item-desc">{description}</div>
      </div>
    </>
  );

  if (external) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
