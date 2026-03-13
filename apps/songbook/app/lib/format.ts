export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function partLabel(type: string, label: string): string {
  if (label) return label;
  return type.charAt(0).toUpperCase() + type.slice(1);
}
