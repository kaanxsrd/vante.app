import { and, eq, gte, sql } from 'drizzle-orm';
import { AlertOctagon, Ban, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { AdminLink } from '@/components/admin/admin-path';
import { EmptyState } from '@/components/admin/empty-state';
import { Pagination, SearchFilter, SelectFilter, TabFilter } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import {
  ClassificationBadge,
  EventStatusBadge,
  SeverityBadge,
} from '@/components/admin/status-badges';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/db';
import { authAttempts, ipRules, securityEvents } from '@/db/schema';
import { listAuditLogs } from '@/features/audit/service';
import { requireAdminPage } from '@/features/auth/session';
import { CLASSIFICATION_SHORT_LABELS, STATUS_LABELS } from '@/features/security/labels';
import { RULE_IDS, RULES } from '@/features/security/rules';
import { getSecurityRules, listIpRules, listSecurityEvents } from '@/features/security/service';
import { SEVERITIES } from '@/features/settings/schema';
import { countryName, formatDateTime, formatNumber, formatRelativeTime } from '@/lib/format';
import { oneOf, PAGE_SIZE, pageFrom, type SearchParams, single } from '@/lib/search-params';
import { IpRulesPanel } from './_components/ip-rules-panel';
import { RulesPanel } from './_components/rules-panel';

export const metadata: Metadata = { title: 'Security Monitoring' };

const TABS = [
  { value: 'events', label: 'Incidents' },
  { value: 'rules', label: 'Detection rules' },
  { value: 'ips', label: 'IP rules' },
  { value: 'audit', label: 'Audit log' },
];

const SEVERITY_OPTIONS = SEVERITIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));
const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
const CLASSIFICATION_OPTIONS = Object.entries(CLASSIFICATION_SHORT_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);
const RULE_OPTIONS = RULE_IDS.map((value) => ({ value, label: RULES[value].label }));
const STATUS_VALUES = Object.keys(STATUS_LABELS);
const CLASSIFICATION_VALUES = Object.keys(CLASSIFICATION_SHORT_LABELS);

async function getSecurityStats() {
  const since = new Date(Date.now() - 86_400_000);
  const [open, critical, failedLogins, blocked] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(securityEvents)
      .where(eq(securityEvents.status, 'open')),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(securityEvents)
      .where(and(eq(securityEvents.severity, 'critical'), gte(securityEvents.lastSeenAt, since))),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(authAttempts)
      .where(and(eq(authAttempts.success, false), gte(authAttempts.createdAt, since))),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(ipRules)
      .where(eq(ipRules.action, 'block')),
  ]);
  return {
    open: open[0]?.value ?? 0,
    critical: critical[0]?.value ?? 0,
    failedLogins: failedLogins[0]?.value ?? 0,
    blocked: blocked[0]?.value ?? 0,
  };
}

async function IncidentsTab({ params }: { params: SearchParams }) {
  const page = pageFrom(params);
  const { rows, total } = await listSecurityEvents({
    q: single(params.q),
    severity: oneOf(single(params.severity), SEVERITIES),
    status: oneOf(single(params.status), STATUS_VALUES),
    classification: oneOf(single(params.classification), CLASSIFICATION_VALUES),
    ruleId: single(params.rule),
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <>
      <div className="flex flex-col flex-wrap gap-2 sm:flex-row">
        <SearchFilter placeholder="IP, key, endpoint or title" />
        <SelectFilter param="severity" label="Severity" options={SEVERITY_OPTIONS} />
        <SelectFilter param="status" label="Status" options={STATUS_OPTIONS} />
        <SelectFilter param="classification" label="Assessment" options={CLASSIFICATION_OPTIONS} />
        <SelectFilter param="rule" label="Rule" options={RULE_OPTIONS} />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No incidents found"
            description="When a detection rule fires, the incident appears here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <SeverityBadge severity={event.severity} />
                  </TableCell>
                  <TableCell className="max-w-md">
                    <AdminLink
                      href={`/security/${event.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {event.title}
                    </AdminLink>
                    <p className="truncate text-xs text-muted-foreground">{event.summary}</p>
                  </TableCell>
                  <TableCell>
                    <ClassificationBadge classification={event.classification} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    <p className="font-mono">{event.ip ?? event.keyPrefix ?? 'System'}</p>
                    {event.country && <p>{countryName(event.country)}</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(event.occurrences)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(event.lastSeenAt)}
                  </TableCell>
                  <TableCell>
                    <EventStatusBadge status={event.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </Card>
    </>
  );
}

async function AuditTab({ params }: { params: SearchParams }) {
  const page = pageFrom(params);
  const { rows, total } = await listAuditLogs({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <Card>
      {rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No administrative activity yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{entry.actor}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {entry.action}
                </TableCell>
                <TableCell className="max-w-md truncate">{entry.summary}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {entry.ip ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </Card>
  );
}

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const tab = oneOf(single(params.tab), ['events', 'rules', 'ips', 'audit']) ?? 'events';
  const stats = await getSecurityStats();

  return (
    <>
      <PageHeader
        title="Security Monitoring"
        description="Automated detection reports what it sees. Only you can confirm a threat."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open incidents"
          value={formatNumber(stats.open)}
          icon={ShieldAlert}
          tone={stats.open > 0 ? 'alert' : 'default'}
        />
        <StatCard
          label="Critical (24h)"
          value={formatNumber(stats.critical)}
          icon={AlertOctagon}
          tone={stats.critical > 0 ? 'alert' : 'default'}
        />
        <StatCard
          label="Failed sign-ins (24h)"
          value={formatNumber(stats.failedLogins)}
          icon={Lock}
        />
        <StatCard label="Blocked IP addresses" value={formatNumber(stats.blocked)} icon={Ban} />
      </div>

      <TabFilter param="tab" options={TABS} fallback="events" />

      {tab === 'events' && <IncidentsTab params={params} />}
      {tab === 'rules' && <RulesPanel rules={Object.values(await getSecurityRules())} />}
      {tab === 'ips' && <IpRulesPanel rules={await listIpRules()} />}
      {tab === 'audit' && <AuditTab params={params} />}
    </>
  );
}
