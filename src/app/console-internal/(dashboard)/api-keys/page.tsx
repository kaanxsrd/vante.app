import { KeyRound } from 'lucide-react';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/admin/empty-state';
import { TabFilter } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { KeyStateBadge } from '@/components/admin/status-badges';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { displayPrefix } from '@/features/api-keys/crypto';
import { API_SCOPES } from '@/features/api-keys/scopes';
import { listApiKeys } from '@/features/api-keys/service';
import { apiKeyState } from '@/features/api-keys/state';
import { requireAdminPage } from '@/features/auth/session';
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/format';
import { type SearchParams, single } from '@/lib/search-params';
import { KeyDialogs } from './_components/key-dialogs';
import { KeyRowActions } from './_components/key-row-actions';

export const metadata: Metadata = { title: 'API Management' };

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
];

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const tab = single(params.state) ?? 'all';
  const keys = (await listApiKeys()).map((key) => ({ ...key, state: apiKeyState(key) }));
  const visible = tab === 'all' ? keys : keys.filter((key) => key.state === tab);

  return (
    <>
      <PageHeader
        title="API Management"
        description="Keys for the /api/v1 endpoints. A key's full value is shown once, when it is created or rotated."
        actions={<KeyDialogs />}
      />

      <TabFilter param="state" options={TABS} fallback="all" />

      <Card>
        {visible.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={tab === 'all' ? 'No API keys yet' : `No ${tab} keys`}
            description="Create a key to start using the API."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead className="text-right">24h usage</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <p className="font-medium">{key.name}</p>
                    <code className="text-xs text-muted-foreground">
                      {displayPrefix(key.prefix)}…
                    </code>
                  </TableCell>
                  <TableCell>
                    <KeyStateBadge state={key.state} />
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="outline"
                          className="font-mono text-[11px]"
                          title={API_SCOPES[scope as keyof typeof API_SCOPES]}
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {formatNumber(key.rateLimitPerMinute)}/min
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    {formatNumber(key.requests24h)}
                    {key.errors24h > 0 && (
                      <span className="ml-1 text-xs text-critical-foreground">
                        ({formatNumber(key.errors24h)} failed)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell>
                    <KeyRowActions
                      apiKey={{
                        id: key.id,
                        name: key.name,
                        description: key.description ?? '',
                        scopes: key.scopes,
                        rateLimitPerMinute: key.rateLimitPerMinute,
                        dailyQuota: key.dailyQuota,
                        allowedOrigins: key.allowedOrigins,
                        allowedIps: key.allowedIps,
                        expectedCountries: key.expectedCountries,
                        expiresAt: key.expiresAt?.toISOString() ?? null,
                        state: key.state,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Rotating a key keeps its usage history. Revoking takes effect immediately on every instance.
      </p>
    </>
  );
}
