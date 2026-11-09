import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdminPage } from '@/features/auth/session';
import { isTwoFactorEnabled, listActiveSessions } from '@/features/auth/sessions';
import { getSetting } from '@/features/settings/service';
import { activeEmailProvider } from '@/lib/email';
import { getEnv } from '@/lib/env';
import { formatRelativeTime } from '@/lib/format';
import {
  AnalyticsSettingsCard,
  PasswordCard,
  RetentionSettingsCard,
  SessionsCard,
} from './_components/settings-cards';
import { TwoFactorCard } from './_components/two-factor-card';

export const metadata: Metadata = { title: 'Settings' };

function Integration({ name, active, note }: { name: string; active: boolean; note: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        <p>{name}</p>
        <p className="truncate text-xs text-muted-foreground">{note}</p>
      </div>
      <Badge variant={active ? 'success' : 'outline'}>{active ? 'Configured' : 'Not set'}</Badge>
    </div>
  );
}

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const env = getEnv();
  const [analytics, retention, sessions, twoFactorEnabled] = await Promise.all([
    getSetting('analytics'),
    getSetting('retention'),
    listActiveSessions(admin),
    isTwoFactorEnabled(admin.userId),
  ]);

  return (
    <>
      <PageHeader title="Settings" description={`Signed in as ${admin.email}.`} />

      <div className="grid gap-4 xl:grid-cols-2">
        <PasswordCard />
        <TwoFactorCard enabled={twoFactorEnabled} />
        <SessionsCard
          sessions={sessions.map((session) => ({
            id: session.id,
            current: session.current,
            ip: session.ipAddress,
            userAgent: session.userAgent,
            lastActive: formatRelativeTime(session.updatedAt),
          }))}
        />
        <AnalyticsSettingsCard initial={analytics} />
        <RetentionSettingsCard initial={retention} />
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <Integration
              name="Email"
              active={activeEmailProvider() !== null}
              note="RESEND_API_KEY, or SMTP_HOST with credentials"
            />
            <Integration
              name="Scheduled jobs"
              active={Boolean(env.CRON_SECRET)}
              note="CRON_SECRET authorizes /api/internal/cron"
            />
            <Integration
              name="Last.fm music"
              active={Boolean(env.LASTFM_API_KEY)}
              note="LASTFM_API_KEY, plus your username in Site Text"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
