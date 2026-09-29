import { notFound } from 'next/navigation';

// Unknown paths under a locale would otherwise get Next's bare, unbranded 404
// (white page, system font) instead of the app's own not-found page.
export default function CatchAll() {
  notFound();
}
