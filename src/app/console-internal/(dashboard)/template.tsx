import type { ReactNode } from 'react';

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter space-y-6">{children}</div>;
}
