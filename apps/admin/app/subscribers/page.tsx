export const runtime = 'edge';

import SubscriberList from '../domains/subscribers/SubscriberList';

export default function SubscribersPage() {
  return (
    <main className="admin-main">
      <div className="admin-header">
        <h1>Subscribers</h1>
      </div>
      <SubscriberList />
    </main>
  );
}
