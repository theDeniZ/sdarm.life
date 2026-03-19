export const runtime = 'edge';

import ApiKeyManager from '../domains/api-keys/ApiKeyManager';

export default function ApiKeysPage() {
  return (
    <main className="admin-main">
      <ApiKeyManager />
    </main>
  );
}
