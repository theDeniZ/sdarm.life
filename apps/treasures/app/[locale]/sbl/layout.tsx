import '../../styles/sbl/index.css';

/**
 * The lesson keeps its own stylesheet, and that stylesheet is imported here and
 * nowhere else — a route that is not this one never loads it.
 *
 * There is no footer. The catalogue and the Bible carry the site footer because
 * they are browsing surfaces; the lesson is a document with a colophon of its
 * own at the foot of the sheet, and the printed booklet ends there.
 */
export default function SblLayout({ children }: { children: React.ReactNode }) {
  return children;
}
