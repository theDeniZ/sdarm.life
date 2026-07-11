'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <button className="sidebar-toggle" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
