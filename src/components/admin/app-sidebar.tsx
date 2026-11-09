'use client';

import {
  Activity,
  BarChart3,
  Bell,
  FileText,
  FolderKanban,
  Images,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  Settings,
  ShieldAlert,
  TextCursorInput,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useState } from 'react';
import { AdminLink } from '@/components/admin/admin-path';
import { BrandMark } from '@/components/admin/brand-mark';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface SidebarBrand {
  name: string;
  logo: string;
}

interface NavItem {
  segment: string | null;
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ segment: null, href: '', label: 'Overview', icon: LayoutDashboard }] },
  {
    label: 'Content',
    items: [
      { segment: 'profile', href: '/profile', label: 'Site Profile', icon: UserRound },
      { segment: 'site-text', href: '/site-text', label: 'Site Text', icon: TextCursorInput },
      { segment: 'blog', href: '/blog', label: 'Blog', icon: FileText },
      { segment: 'authors', href: '/authors', label: 'Authors', icon: UsersRound },
      { segment: 'projects', href: '/projects', label: 'Projects', icon: FolderKanban },
      { segment: 'media', href: '/media', label: 'Media', icon: Images },
    ],
  },
  {
    label: 'API',
    items: [
      { segment: 'api-keys', href: '/api-keys', label: 'API Management', icon: KeyRound },
      { segment: 'api-analytics', href: '/api-analytics', label: 'API Analytics', icon: Activity },
    ],
  },
  {
    label: 'Insights',
    items: [
      { segment: 'analytics', href: '/analytics', label: 'Website Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Security',
    items: [
      { segment: 'security', href: '/security', label: 'Security Monitoring', icon: ShieldAlert },
      { segment: 'notifications', href: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [{ segment: 'settings', href: '/settings', label: 'Settings', icon: Settings }],
  },
];

function Navigation({
  openIncidents,
  onNavigate,
}: {
  openIncidents: number;
  onNavigate?: () => void;
}) {
  const segment = useSelectedLayoutSegment();
  return (
    <nav aria-label="Dashboard" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label ?? index}>
          {group.label && (
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = segment === item.segment;
              return (
                <li key={item.href}>
                  <AdminLink
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                    {item.segment === 'security' && openIncidents > 0 && (
                      <span
                        className="ml-auto rounded-full bg-critical/15 px-1.5 text-[11px] font-semibold tabular-nums text-critical-foreground"
                        title={`${openIncidents} open incidents`}
                      >
                        {openIncidents}
                      </span>
                    )}
                  </AdminLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ brand }: { brand: SidebarBrand }) {
  return (
    <div className="flex h-14 items-center gap-2.5 border-b px-4">
      <BrandMark name={brand.name} logo={brand.logo} className="size-7 shrink-0 text-xs" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold">{brand.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">Control center</p>
      </div>
    </div>
  );
}

export function DesktopSidebar({
  openIncidents,
  brand,
}: {
  openIncidents: number;
  brand: SidebarBrand;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <Brand brand={brand} />
      <Navigation openIncidents={openIncidents} />
    </aside>
  );
}

export function MobileSidebar({
  openIncidents,
  brand,
}: {
  openIncidents: number;
  brand: SidebarBrand;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <SheetContent aria-describedby={undefined}>
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <Brand brand={brand} />
        <Navigation openIncidents={openIncidents} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Dialog>
  );
}
