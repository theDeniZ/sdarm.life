'use client';

import AdminNav from './AdminNav';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      <main className="admin-main">{children}</main>
    </>
  );
}
