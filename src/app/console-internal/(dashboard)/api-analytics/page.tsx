import { Activity, AlertTriangle, Ban, CheckCircle2, Gauge, Timer, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { BarList, SegmentedBar, TrendChart } from '@/components/admin/charts';
import { EmptyState } from '@/components/admin/empty-state';
import {
  LiveRefresh,
  Pagination,
  RangeFilter,
  SearchFilter,
  SelectFilter,
} from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { HttpStatusBadge } from '@/components/admin/status-badges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getApiCountries,
  getApiSummary,
  getEndpointStats,
  getKeyStats,
  getRequestTrend,
  getStatusDistribution,
  getSuspiciousTrend,
  listApiRequests,
} from '@/features/api-monitoring/queries';
import { requireAdminPage } from '@/features/auth/session';
import { parseDateRange } from '@/lib/date-range';
import {
  countryName,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
} from '@/lib/format';
import {
  oneOf,
  PAGE_SIZE,
  pageFrom,
  rangeParams,
  type SearchParams,
  single,
} from '@/lib/search-params';

export const metadata: Metadata = { title: 'API Analytics' };

const OUTCOME_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'client_error', label: 'Client error' },
  { value: 'server_error', label: 'Server error' },
  { value: 'unauthorized', label: 'Unauthorized' },
  { value: 'forbidden', label: 'Forbidden' },
  { value: 'rate_limited', label: 'Rate limited' },
];

const OUTCOME_VALUES = OUTCOME_OPTIONS.map((option) => option.value);

const STATUS_GROUPS = [
  { key: '2xx', label: '2xx success', color: 'var(--success)', test: (code: number) => code < 300 },
  {
    key: '3xx',
    label: '3xx redirect',
    color: 'var(--chart-1)',
    test: (code: number) => code >= 300 && code < 400,
  },
  {
    key: '4xx',
    label: '4xx client error',
    color: 'var(--warning)',
    test: (code: number) => code >= 400 && code < 500,
  },
  {
    key: '5xx',
    label: '5xx server error',
    color: 'var(--critical)',
    test: (code: number) => code >= 500,
  },
];

export default async function ApiAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const range = parseDateRange(rangeParams(params));
  const page = pageFrom(params);

  const [summary, trend, endpoints, keys, statuses, countries, suspicious, requests] =
    await Promise.all([
      getApiSummary(range),
      getRequestTrend(range),
      getEndpointStats(range),
      getKeyStats(range),
      getStatusDistribution(range),
      getApiCountries(range),
      getSuspiciousTrend(range),
      listApiRequests({
        range,
        q: single(params.q),
        outcome: oneOf(single(params.outcome), OUTCOME_VALUES),
        endpoint: single(params.endpoint),
        page,
        pageSize: PAGE_SIZE,
      }),
    ]);

  const successRate = summary.total > 0 ? summary.successful / summary.total : 0;
  const statusSegments = STATUS_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    color: group.color,
    value: statuses
      .filter((row) => group.test(row.statusCode))
      .reduce((sum, row) => sum + row.total, 0),
  })).filter((segment) => segment.value > 0);

  return (
    <>
      <PageHeader title="API Analytics" description={`${range.label}. All times in UTC.`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeFilter />
        <LiveRefresh />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total requests" value={formatNumber(summary.total)} icon={Activity} />
        <StatCard
          label="Successful"
          value={formatNumber(summary.successful)}
          hint={`${formatPercent(successRate)} success rate`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Failed"
          value={formatNumber(summary.failed)}
          hint={`${formatNumber(summary.serverErrors)} server errors`}
          icon={XCircle}
          tone={summary.serverErrors > 0 ? 'alert' : 'default'}
        />
        <StatCard
          label="Average response"
          value={formatDuration(summary.avgDuration)}
          icon={Timer}
        />
        <StatCard
          label="95th percentile"
          value={formatDuration(summary.p95Duration)}
          icon={Gauge}
        />
        <StatCard
          label="Rate-limit violations"
          value={formatNumber(summary.rateLimited)}
          icon={Ban}
          tone={summary.rateLimited > 0 ? 'alert' : 'default'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Requests over time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={trend}
              bucket={range.bucket}
              stacked
              summary={`${summary.total} requests, ${summary.failed} failed.`}
              series={[
                { key: 'successful', label: 'Successful' },
                { key: 'failed', label: 'Failed' },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status codes</CardTitle>
            <CardDescription>Distribution of responses</CardDescription>
          </CardHeader>
          <CardContent>
            {statusSegments.length === 0 ? (
              <EmptyState icon={Activity} title="No requests in this period" />
            ) : (
              <>
                <SegmentedBar items={statusSegments} />
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {statuses.map((row) => (
                    <li
                      key={row.statusCode}
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <HttpStatusBadge code={row.statusCode} />
                      <span className="tabular-nums">{formatNumber(row.total)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average response time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={trend}
              bucket={range.bucket}
              height={200}
              unit="ms"
              summary={`Average response time ${formatDuration(summary.avgDuration)}.`}
              series={[{ key: 'avgDuration', label: 'Average response' }]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Suspicious activity</CardTitle>
            <CardDescription>New security incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={suspicious}
              bucket={range.bucket}
              height={200}
              summary="New security incidents over time."
              series={[{ key: 'events', label: 'Incidents', color: 'var(--chart-2)' }]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            {endpoints.length === 0 ? (
              <EmptyState icon={Activity} title="No traffic yet" />
            ) : (
              <BarList
                items={endpoints.map((row) => ({
                  key: row.endpoint,
                  label: row.endpoint,
                  value: row.total,
                  detail: `${row.failed} failed · ${formatDuration(row.avgDuration)} average`,
                }))}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top API keys</CardTitle>
          </CardHeader>
          <CardContent>
            {keys.length === 0 ? (
              <EmptyState icon={Activity} title="No traffic yet" />
            ) : (
              <BarList
                items={keys.map((row) => ({
                  key: row.apiKeyId ?? 'unauthenticated',
                  label: row.apiKeyId ? `${row.name} (${row.keyPrefix})` : row.name,
                  value: row.total,
                  detail: `${row.failed} failed`,
                }))}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Request origin by country</CardTitle>
            <CardDescription>Approximate, from IP geolocation</CardDescription>
          </CardHeader>
          <CardContent>
            {countries.length === 0 ? (
              <EmptyState icon={Activity} title="No traffic yet" />
            ) : (
              <BarList
                items={countries.map((row) => ({
                  key: row.country ?? 'unknown',
                  label: countryName(row.country),
                  value: row.total,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request history</CardTitle>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <SearchFilter placeholder="Path, IP, key or error code" />
            <SelectFilter param="outcome" label="Outcome" options={OUTCOME_OPTIONS} />
            <SelectFilter
              param="endpoint"
              label="Endpoint"
              options={endpoints.map((row) => ({ value: row.endpoint, label: row.endpoint }))}
            />
          </div>
        </CardHeader>
        {requests.rows.length === 0 ? (
          <EmptyState icon={Activity} title="No matching requests" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <code className="block truncate text-xs">
                      {row.method} {row.path}
                    </code>
                    {row.errorCode && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertTriangle className="size-3" aria-hidden="true" />
                        {row.errorCode}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <HttpStatusBadge code={row.statusCode} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {row.keyPrefix ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {row.ip ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {countryName(row.country)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDuration(row.durationMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} total={requests.total} pageSize={PAGE_SIZE} />
      </Card>
    </>
  );
}
