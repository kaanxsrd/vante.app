import { Bell, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import { AdminLink } from '@/components/admin/admin-path';
import { EmptyState } from '@/components/admin/empty-state';
import { Pagination, SelectFilter } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { SeverityBadge } from '@/components/admin/status-badges';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireAdminPage } from '@/features/auth/session';
import { listNotifications, resolveRecipient } from '@/features/notifications/service';
import { getSetting } from '@/features/settings/service';
import { activeEmailProvider } from '@/lib/email';
import { formatDateTime } from '@/lib/format';
import { oneOf, PAGE_SIZE, pageFrom, type SearchParams, single } from '@/lib/search-params';
import { NotificationPreferences, RetryButton } from './_components/notification-preferences';

export const metadata: Metadata = { title: 'Notifications' };

const STATUS_OPTIONS = [
  { value: 'sent', label: 'Sent' },
  { value: 'queued', label: 'Queued' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  sent: 'success',
  queued: 'secondary',
  failed: 'critical',
  skipped: 'outline',
};

const PROVIDER_LABEL = { resend: 'Resend', smtp: 'SMTP' } as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = pageFrom(params);
  const [settings, history] = await Promise.all([
    getSetting('notifications'),
    listNotifications({
      status: oneOf(
        single(params.status),
        STATUS_OPTIONS.map((option) => option.value),
      ),
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);
  const provider = activeEmailProvider();

  return (
    <>
      <PageHeader title="Notifications" description="Email alerts for security incidents." />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <NotificationPreferences initial={settings} hasProvider={provider !== null} />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Provider</span>
              {provider ? (
                <Badge variant="success">{PROVIDER_LABEL[provider]}</Badge>
              ) : (
                <Badge variant="warning">Not configured</Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">Sending to</span>
              <span className="truncate">{resolveRecipient(settings) ?? 'Nobody'}</span>
            </div>
            {!provider && (
              <p className="text-xs text-muted-foreground">
                Set RESEND_API_KEY to send alerts. Until then, alerts are recorded here as skipped.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">History</h2>
        <SelectFilter param="status" label="Status" options={STATUS_OPTIONS} />
      </div>

      <Card>
        {history.rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Sent alerts appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {row.securityEventId ? (
                      <AdminLink
                        href={`/security/${row.securityEventId}`}
                        className="block truncate hover:underline"
                      >
                        {row.subject}
                      </AdminLink>
                    ) : (
                      <span className="block truncate">{row.subject}</span>
                    )}
                    {row.error && (
                      <p className="truncate text-xs text-critical-foreground" title={row.error}>
                        {row.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={row.severity} />
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {row.recipient}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status]} className="capitalize">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.attempts}
                  </TableCell>
                  <TableCell>
                    {(row.status === 'failed' || row.status === 'skipped') && (
                      <RetryButton id={row.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} total={history.total} pageSize={PAGE_SIZE} />
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="size-3.5" aria-hidden="true" />
        Critical incidents ignore the severity filter. At most 60 alerts are sent per hour, and
        every incident is still recorded.
      </p>
    </>
  );
}
