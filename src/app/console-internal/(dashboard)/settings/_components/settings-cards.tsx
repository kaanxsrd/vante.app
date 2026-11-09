'use client';

import { Monitor } from 'lucide-react';
import { useState } from 'react';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { Field } from '@/components/admin/content-fields';
import { useAction } from '@/components/admin/use-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from '@/features/auth/account-actions';
import { PASSWORD_MIN_LENGTH } from '@/features/auth/constants';
import {
  purgeAnalyticsAction,
  saveAnalyticsSettingsAction,
  saveRetentionSettingsAction,
} from '@/features/settings/actions';
import type { AnalyticsSettings, RetentionSettings } from '@/features/settings/schema';

export function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const change = useAction(changePasswordAction, {
    success: 'Password changed. Other sessions were signed out.',
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            change.run({ currentPassword, newPassword });
          }}
        >
          <Field id="current-password" label="Current password">
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field
            id="new-password"
            label="New password"
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          >
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={change.pending || !currentPassword || !newPassword}>
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface SessionRow {
  id: string;
  current: boolean;
  ip: string | null;
  userAgent: string | null;
  lastActive: string;
}

export function SessionsCard({ sessions }: { sessions: SessionRow[] }) {
  const revoke = useAction(revokeSessionAction, { success: 'Session signed out' });
  const revokeOthers = useAction(revokeOtherSessionsAction, {
    success: (result) => `Signed out ${result.count} other sessions`,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Active sessions</CardTitle>
        {sessions.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            disabled={revokeOthers.pending}
            onClick={() => revokeOthers.run({})}
          >
            Sign out others
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <Monitor className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm" title={session.userAgent ?? undefined}>
                    {session.userAgent ?? 'Unknown device'}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {session.ip ?? 'Unknown address'} · {session.lastActive}
                  </p>
                </div>
              </div>
              {session.current ? (
                <Badge variant="success">This device</Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.pending}
                  onClick={() => revoke.run({ id: session.id })}
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function AnalyticsSettingsCard({ initial }: { initial: AnalyticsSettings }) {
  const [settings, setSettings] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const save = useAction(saveAnalyticsSettingsAction, { success: 'Analytics settings saved' });
  const purge = useAction(purgeAnalyticsAction, {
    success: (result) => `Deleted ${result.deleted} page views`,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Website analytics and privacy</CardTitle>
        <CardDescription>
          Do Not Track and Global Privacy Control are always honored.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="analytics-enabled">Collect page views</Label>
          <Switch
            id="analytics-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
          />
        </div>
        <Field id="analytics-retention" label="Keep page views for (days)">
          <Input
            id="analytics-retention"
            type="number"
            min={7}
            max={730}
            value={settings.retentionDays}
            onChange={(event) =>
              setSettings({ ...settings, retentionDays: Number(event.target.value) })
            }
          />
        </Field>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" onClick={() => setConfirming(true)}>
            Delete all analytics data
          </Button>
          <Button disabled={save.pending} onClick={() => save.run(settings)}>
            Save
          </Button>
        </div>
      </CardContent>
      <ConfirmAction
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete all website analytics?"
        description="Every recorded page view is permanently removed. API monitoring is not affected."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => purge.run({ confirm: true })}
      />
    </Card>
  );
}

const RETENTION_FIELDS: { key: keyof RetentionSettings; label: string; min: number }[] = [
  { key: 'apiRequestDays', label: 'API request history', min: 7 },
  { key: 'securityEventDays', label: 'Closed security incidents', min: 30 },
  { key: 'auditLogDays', label: 'Audit log', min: 30 },
  { key: 'notificationDays', label: 'Notification history', min: 7 },
];

export function RetentionSettingsCard({ initial }: { initial: RetentionSettings }) {
  const [settings, setSettings] = useState(initial);
  const save = useAction(saveRetentionSettingsAction, { success: 'Retention saved' });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data retention</CardTitle>
        <CardDescription>
          Older records are deleted automatically. Values are in days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {RETENTION_FIELDS.map((field) => (
            <Field key={field.key} id={field.key} label={field.label}>
              <Input
                id={field.key}
                type="number"
                min={field.min}
                value={settings[field.key]}
                onChange={(event) =>
                  setSettings({ ...settings, [field.key]: Number(event.target.value) })
                }
              />
            </Field>
          ))}
        </div>
        <div className="flex justify-end">
          <Button disabled={save.pending} onClick={() => save.run(settings)}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
