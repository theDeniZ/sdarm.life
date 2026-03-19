export const runtime = 'edge';

import SubscriberList from '../domains/subscribers/SubscriberList';

export default function SubscribersPage() {
  return (
    <>
      <div className="page-header">
        <h1>Subscribers</h1>
      </div>
      <SubscriberList />
    </>
  );
}
