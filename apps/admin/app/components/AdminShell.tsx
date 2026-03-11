'use client';

import Sidebar from './Sidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-main">{children}</main>
    </div>
  );
}
