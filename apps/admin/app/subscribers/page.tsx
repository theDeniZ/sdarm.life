export const runtime = 'edge';

import SubscriberList from '../domains/subscribers/SubscriberList';
import NotifySubscribers from '../domains/subscribers/NotifySubscribers';

export default function SubscribersPage() {
  return (
    <>
      <div className="page-header">
        <h1>Subscribers</h1>
      </div>
      <NotifySubscribers />
      <SubscriberList />
    </>
  );
}
