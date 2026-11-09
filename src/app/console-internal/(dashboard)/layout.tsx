import { eq, sql } from 'drizzle-orm';
import type { ReactNode } from 'react';
import { DesktopSidebar, MobileSidebar } from '@/components/admin/app-sidebar';
import { ThemeToggle, UserMenu } from '@/components/admin/user-menu';
import { db } from '@/db';
import { securityEvents } from '@/db/schema';
import { requireAdminPage } from '@/features/auth/session';
import { getSiteProfile } from '@/features/profile/queries';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage();
  const [open] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(securityEvents)
    .where(eq(securityEvents.status, 'open'));
  const openIncidents = open?.value ?? 0;
  const profile = await getSiteProfile();
  const brand = { name: profile.siteName || profile.name, logo: profile.logo };

  return (
    <div className="flex min-h-dvh bg-background">
      <DesktopSidebar openIncidents={openIncidents} brand={brand} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur md:justify-end md:px-6">
          <MobileSidebar openIncidents={openIncidents} brand={brand} />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu email={admin.email} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
