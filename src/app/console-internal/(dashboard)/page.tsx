import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  FolderKanban,
  KeyRound,
  Lock,
  ServerCrash,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import { AdminLink } from '@/components/admin/admin-path';
import { TrendChart } from '@/components/admin/charts';
import { EmptyState } from '@/components/admin/empty-state';
import { RangeFilter } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { SeverityBadge } from '@/components/admin/status-badges';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdminPage } from '@/features/auth/session';
import { getOverview, type HealthStatus } from '@/features/overview/queries';
import { parseDateRange } from '@/lib/date-range';
import { formatDuration, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format';
import { rangeParams, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Overview' };

const HEALTH: Record<
  HealthStatus,
  { label: string; variant: BadgeVariant; icon: typeof Activity }
> = {
  healthy: { label: 'Healthy', variant: 'success', icon: CheckCircle2 },
  degraded: { label: 'Degraded', variant: 'warning', icon: AlertTriangle },
  down: { label: 'Failing', variant: 'critical', icon: ServerCrash },
  idle: { label: 'No recent traffic', variant: 'outline', icon: Activity },
};

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const range = parseDateRange(rangeParams(await searchParams));
  const data = await getOverview(range);
  const health = HEALTH[data.health.status];
  const errorRate = data.api.total > 0 ? data.api.failed / data.api.total : 0;

  return (
    <>
      <PageHeader title="Overview" description={`${range.label}. All times in UTC.`} />
      <RangeFilter />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total visitors"
          value={formatNumber(data.website.visitors)}
          hint="Each counted once per day"
          icon={Users}
          trend={data.visitorTrend.map((point) => point.visitors)}
        />
        <StatCard
          label="Unique visitors"
          value={formatNumber(data.uniqueToday)}
          hint="Today (UTC)"
          icon={UserCheck}
        />
        <StatCard
          label="Page views"
          value={formatNumber(data.website.views)}
          icon={Eye}
          trend={data.visitorTrend.map((point) => point.views)}
        />
        <StatCard
          label="Blog posts"
          value={formatNumber(data.posts.total)}
          hint={`${data.posts.published} published`}
          icon={FileText}
        />
        <StatCard
          label="Projects"
          value={formatNumber(data.projects.total)}
          hint={`${data.projects.published} published`}
          icon={FolderKanban}
        />
        <StatCard
          label="API requests"
          value={formatNumber(data.api.total)}
          icon={KeyRound}
          trend={data.requestTrend.map((point) => point.successful + point.failed)}
        />
        <StatCard
          label="API errors"
          value={formatNumber(data.api.failed)}
          hint={`${formatPercent(errorRate)} of requests`}
          icon={ServerCrash}
          tone={data.api.serverErrors > 0 ? 'alert' : 'default'}
        />
        <StatCard
          label="Failed sign-ins"
          value={formatNumber(data.failedLogins)}
          hint="Dashboard authentication"
          icon={Lock}
          tone={data.failedLogins > 0 ? 'alert' : 'default'}
        />
        <StatCard
          label="Invalid API credentials"
          value={formatNumber(data.api.unauthorized)}
          hint="Rejected with 401"
          icon={KeyRound}
        />
        <StatCard
          label="Suspicious activity"
          value={formatNumber(data.suspicious.total)}
          hint={`${data.suspicious.open} open incidents`}
          icon={ShieldAlert}
          tone={data.suspicious.open > 0 ? 'alert' : 'default'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visitors</CardTitle>
            <CardDescription>Page views and unique visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data.visitorTrend}
              bucket={range.bucket}
              height={220}
              summary={`${data.website.views} page views from ${data.website.visitors} visitors.`}
              series={[
                { key: 'views', label: 'Page views' },
                { key: 'visitors', label: 'Visitors' },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API traffic</CardTitle>
            <CardDescription>Successful and failed requests</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data.requestTrend}
              bucket={range.bucket}
              height={220}
              stacked
              summary={`${data.api.total} API requests, ${data.api.failed} failed.`}
              series={[
                { key: 'successful', label: 'Successful' },
                { key: 'failed', label: 'Failed' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>API health</CardTitle>
              <CardDescription>Last 60 minutes</CardDescription>
            </div>
            <Badge variant={health.variant}>
              <health.icon aria-hidden="true" />
              {health.label}
            </Badge>
          </CardHeader>
          <CardContent className="divide-y">
            <HealthRow label="Requests" value={formatNumber(data.health.requestsLastHour)} />
            <HealthRow label="Server errors" value={formatNumber(data.health.errorsLastHour)} />
            <HealthRow
              label="Average response"
              value={formatDuration(data.health.avgDurationLastHour)}
            />
            <HealthRow
              label="95th percentile"
              value={formatDuration(data.health.p95DurationLastHour)}
            />
            <HealthRow
              label="Database latency"
              value={
                data.health.databaseLatencyMs === null
                  ? 'Unreachable'
                  : `${data.health.databaseLatencyMs}ms`
              }
            />
            <HealthRow label="Queued jobs" value={formatNumber(data.health.queueDepth)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Recent security events</CardTitle>
              <CardDescription>Latest incidents</CardDescription>
            </div>
            <AdminLink href="/security" className="text-xs text-muted-foreground hover:underline">
              View all
            </AdminLink>
          </CardHeader>
          <CardContent>
            {data.recentEvents.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="No security events"
                description="Detected incidents appear here."
              />
            ) : (
              <ul className="divide-y">
                {data.recentEvents.map((event) => (
                  <li key={event.id} className="py-2.5 first:pt-0 last:pb-0">
                    <AdminLink href={`/security/${event.id}`} className="group block">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium group-hover:underline">
                          {event.title}
                        </span>
                        <SeverityBadge severity={event.severity} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.ip ?? event.keyPrefix ?? 'System'} ·{' '}
                        {formatRelativeTime(event.lastSeenAt)}
                      </p>
                    </AdminLink>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent administrative activity</CardTitle>
            <CardDescription>What changed, and who changed it</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" />
            ) : (
              <ul className="divide-y">
                {data.recentActivity.map((entry) => (
                  <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="truncate text-sm">{entry.summary}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.actor} · {formatRelativeTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
