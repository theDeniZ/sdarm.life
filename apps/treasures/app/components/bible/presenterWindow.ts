/**
 * Open (or reuse) the display window for the presenter.
 *
 * An open display is navigated rather than replaced, so a second launch does
 * not leave an orphaned window on the projector. On browsers with the Window
 * Management API the new window is placed on the non-primary screen.
 */
export async function openDisplayWindow(url: string, current: Window | null): Promise<Window | null> {
  if (current && !current.closed) {
    current.location.assign(url);
    return current;
  }

  let features = `width=${screen.availWidth},height=${screen.availHeight},left=${
    (screen as Screen & { availLeft?: number }).availLeft ?? 0
  },top=${(screen as Screen & { availTop?: number }).availTop ?? 0}`;
  try {
    type ScreenInfo = {
      availLeft: number;
      availTop: number;
      availWidth: number;
      availHeight: number;
      isPrimary: boolean;
    };
    const details = await (
      window as Window & { getScreenDetails?: () => Promise<{ screens: ScreenInfo[] }> }
    ).getScreenDetails?.();
    const external = details?.screens.find((s) => !s.isPrimary) ?? details?.screens[0];
    if (external) {
      features = `width=${external.availWidth},height=${external.availHeight},left=${external.availLeft},top=${external.availTop}`;
    }
  } catch {
    // Permission denied or unsupported — fall back to the current screen.
  }
  return window.open(url, 'bible-projector-display', features);
}

/** The display window URL for a set of translations, primary first. */
export function displayUrl(locale: string, codes: string[], bookCode: string, chapter: number): string {
  const params = new URLSearchParams({ projector: '1' });
  if (codes.length > 1) params.set('with', codes.slice(1).join(','));
  return `/${locale}/bible/${codes[0]}/${bookCode}/${chapter}?${params.toString().replace(/%2C/g, ',')}`;
}
