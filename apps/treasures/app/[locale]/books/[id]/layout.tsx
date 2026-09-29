import '../../../styles/reader/index.css';

/**
 * The EPUB reader's stylesheet is imported here and nowhere else, so a route
 * that is not this one never loads it — the catalogue in particular.
 *
 * This route also renders BookDetail when a book has no EPUB, and that page
 * receives the reader stylesheet too. It is harmless there: every reader rule
 * is scoped to the reader's own elements.
 */
export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
