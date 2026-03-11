const API = process.env.API_URL ?? 'https://api.sdarm.life/api/v1';

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="page unsubscribe-page">
        <p>Ungültiger Link.</p>
      </main>
    );
  }

  let ok = false;
  try {
    const res = await fetch(`${API}/unsubscribe?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    ok = res.ok;
  } catch {
    // fall through to error state
  }

  return (
    <main className="page unsubscribe-page">
      {ok ? (
        <p>Sie wurden erfolgreich abgemeldet.</p>
      ) : (
        <p>Der Link ist ungültig oder abgelaufen.</p>
      )}
    </main>
  );
}
