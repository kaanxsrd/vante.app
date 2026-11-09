import { BarChart3, Eye, FileText, FolderKanban, UserCheck, Users } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BarList, SegmentedBar, TrendChart } from '@/components/admin/charts';
import { EmptyState } from '@/components/admin/empty-state';
import { RangeFilter } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getCountries,
  getDevices,
  getPopularPosts,
  getPopularProjects,
  getReferrers,
  getSources,
  getTopPages,
  getUniqueVisitorsToday,
  getVisitorTrend,
  getWebsiteSummary,
} from '@/features/analytics/queries';
import { requireAdminPage } from '@/features/auth/session';
import { getSetting } from '@/features/settings/service';
import { parseDateRange } from '@/lib/date-range';
import { countryName, formatNumber } from '@/lib/format';
import { rangeParams, type SearchParams } from '@/lib/search-params';

export const metadata: Metadata = { title: 'Website Analytics' };

function Panel({
  title,
  description,
  isEmpty,
  children,
}: {
  title: string;
  description?: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isEmpty ? <EmptyState icon={BarChart3} title="No data in this period" /> : children}
      </CardContent>
    </Card>
  );
}

export default async function WebsiteAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const range = parseDateRange(rangeParams(await searchParams));

  const [
    settings,
    summary,
    uniqueToday,
    trend,
    pages,
    sources,
    referrers,
    countries,
    devices,
    posts,
    projects,
  ] = await Promise.all([
    getSetting('analytics'),
    getWebsiteSummary(range),
    getUniqueVisitorsToday(),
    getVisitorTrend(range),
    getTopPages(range),
    getSources(range),
    getReferrers(range),
    getCountries(range),
    getDevices(range),
    getPopularPosts(range),
    getPopularProjects(range),
  ]);

  const viewsPerVisitor = summary.visitors > 0 ? summary.views / summary.visitors : 0;
  const knownReferrers = referrers.filter((row) => row.name);

  return (
    <>
      <PageHeader
        title="Website Analytics"
        description={`${range.label}. Cookieless, with no stored IP addresses.${settings.enabled ? '' : ' Collection is currently off.'}`}
      />
      <RangeFilter />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total visitors"
          value={formatNumber(summary.visitors)}
          hint="Each counted once per day"
          icon={Users}
        />
        <StatCard
          label="Unique visitors"
          value={formatNumber(uniqueToday)}
          hint="Today (UTC)"
          icon={UserCheck}
        />
        <StatCard label="Page views" value={formatNumber(summary.views)} icon={Eye} />
        <StatCard label="Views per visitor" value={viewsPerVisitor.toFixed(2)} icon={BarChart3} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visitor trends</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={trend}
            bucket={range.bucket}
            summary={`${summary.views} page views from ${summary.visitors} visitors.`}
            series={[
              { key: 'views', label: 'Page views' },
              { key: 'visitors', label: 'Visitors' },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Most visited pages" isEmpty={pages.length === 0}>
          <BarList
            items={pages.map((row) => ({
              key: row.name ?? '',
              label: row.name ?? '',
              value: row.views,
              detail: `${row.visitors} visitors`,
            }))}
          />
        </Panel>
        <Panel title="Popular blog posts" isEmpty={posts.length === 0}>
          <BarList
            items={posts.map((row) => ({
              key: row.slug,
              label: row.title,
              value: row.views,
              detail: `${row.visitors} visitors`,
            }))}
          />
        </Panel>
        <Panel title="Popular projects" isEmpty={projects.length === 0}>
          <BarList
            items={projects.map((row) => ({
              key: row.slug,
              label: row.title,
              value: row.views,
              detail: `${row.visitors} visitors`,
            }))}
          />
        </Panel>
        <Panel
          title="Traffic sources"
          description="How visits began"
          isEmpty={sources.length === 0}
        >
          <SegmentedBar
            items={sources.map((row) => ({
              key: row.name ?? 'direct',
              label: row.name ?? 'direct',
              value: row.views,
            }))}
          />
        </Panel>
        <Panel title="Referring sites" isEmpty={knownReferrers.length === 0}>
          <BarList
            items={knownReferrers.map((row) => ({
              key: row.name ?? '',
              label: row.name ?? '',
              value: row.views,
            }))}
          />
        </Panel>
        <Panel title="Devices" isEmpty={devices.length === 0}>
          <SegmentedBar
            items={devices.map((row) => ({
              key: row.name ?? 'other',
              label: row.name ?? 'other',
              value: row.views,
            }))}
          />
        </Panel>
        <Panel
          title="Geographic distribution"
          description="Approximate, from IP geolocation"
          isEmpty={countries.length === 0}
        >
          <BarList
            items={countries.map((row) => ({
              key: row.name ?? 'unknown',
              label: countryName(row.name),
              value: row.views,
            }))}
          />
        </Panel>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileText className="size-3.5" aria-hidden="true" />
        <FolderKanban className="size-3.5" aria-hidden="true" />
        Stored separately from API monitoring. Visitors are counted once per day because the hash
        that identifies them is destroyed daily.
      </p>
    </>
  );
}
