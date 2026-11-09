import { ArrowLeft, Info } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { AdminLink } from '@/components/admin/admin-path';
import {
  ClassificationBadge,
  EventStatusBadge,
  SeverityBadge,
} from '@/components/admin/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiKey } from '@/features/api-keys/service';
import { requireAdminPage } from '@/features/auth/session';
import { isRuleId, RULES } from '@/features/security/rules';
import { getSecurityEvent } from '@/features/security/service';
import { countryName, formatDateTime, formatNumber } from '@/lib/format';
import { IncidentActions } from './incident-actions';

export const metadata: Metadata = { title: 'Incident' };

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[160px_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const event = await getSecurityEvent(id);
  if (!event) notFound();

  const definition = isRuleId(event.ruleId) ? RULES[event.ruleId] : null;
  const key = event.apiKeyId ? await getApiKey(event.apiKeyId) : null;
  const detailEntries = Object.entries(event.details);

  return (
    <>
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to incidents">
          <AdminLink href="/security">
            <ArrowLeft />
          </AdminLink>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{event.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <SeverityBadge severity={event.severity} />
            <ClassificationBadge classification={event.classification} />
            <EventStatusBadge status={event.status} />
          </div>
        </div>
      </div>

      {event.classification === 'anomaly' && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This is an anomaly, not a confirmed attack. Geolocation can be wrong, and VPNs, proxies
          and mobile networks often explain unusual locations. Review it alongside other signals.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Detail label="First seen">{formatDateTime(event.firstSeenAt)}</Detail>
                <Detail label="Last seen">{formatDateTime(event.lastSeenAt)}</Detail>
                <Detail label="Occurrences">{formatNumber(event.occurrences)}</Detail>
                <Detail label="API key">
                  {event.keyPrefix ? <code className="text-xs">{event.keyPrefix}</code> : 'None'}
                  {key && <span className="ml-2 text-muted-foreground">{key.name}</span>}
                </Detail>
                <Detail label="Endpoint">
                  {event.endpoint ? (
                    <code className="text-xs">
                      {event.method} {event.endpoint}
                    </code>
                  ) : (
                    '—'
                  )}
                </Detail>
                <Detail label="Status code">{event.statusCode ?? '—'}</Detail>
                <Detail label="IP address">
                  {event.ip ? <code className="text-xs">{event.ip}</code> : '—'}
                </Detail>
                <Detail label="Country (approx.)">
                  {event.country ? countryName(event.country) : 'Unknown'}
                </Detail>
                <Detail label="Request origin">{event.origin ?? '—'}</Detail>
                <Detail label="User agent">
                  <span className="text-xs text-muted-foreground">{event.userAgent ?? '—'}</span>
                </Detail>
                {event.actionTaken && <Detail label="Action taken">{event.actionTaken}</Detail>}
                {event.resolutionNote && <Detail label="Note">{event.resolutionNote}</Detail>}
              </dl>
            </CardContent>
          </Card>

          {detailEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detection details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  {detailEntries.map(([label, value]) => (
                    <Detail key={label} label={label}>
                      <code className="text-xs">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </code>
                    </Detail>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <IncidentActions
            id={event.id}
            status={event.status}
            isConfirmed={event.classification === 'confirmed_threat'}
            ip={event.ip}
            apiKeyId={key && !key.revokedAt ? key.id : null}
          />
          {definition && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                  {definition.recommendedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
