export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function partLabel(type: string, label: string): string {
  if (label) return label;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Default the projector slide theme to whatever the site theme currently is.
export function getSiteTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

// Interleaves chorus parts after each verse so the chorus repeats between verses.
// Chorus parts are removed from their original position and re-inserted after every verse.
// If there are no chorus parts, returns the original array unchanged.
export function expandParts<T extends { type: string }>(parts: T[]): T[] {
  const choruses = parts.filter((p) => p.type === 'chorus');
  if (choruses.length === 0) return parts;

  const result: T[] = [];
  for (const part of parts) {
    if (part.type === 'chorus') continue;
    result.push(part);
    if (part.type === 'verse') result.push(...choruses);
  }
  return result;
}
