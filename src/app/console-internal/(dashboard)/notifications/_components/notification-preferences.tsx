'use client';

import { RotateCw, Send } from 'lucide-react';
import { useState } from 'react';
import { Field } from '@/components/admin/content-fields';
import { useAction } from '@/components/admin/use-action';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  retryNotificationAction,
  saveNotificationSettingsAction,
  sendTestNotificationAction,
} from '@/features/notifications/actions';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationSettings,
  SEVERITIES,
  type Severity,
} from '@/features/settings/schema';

export function NotificationPreferences({
  initial,
  hasProvider,
}: {
  initial: NotificationSettings;
  hasProvider: boolean;
}) {
  const [settings, setSettings] = useState(initial);
  const save = useAction(saveNotificationSettingsAction, { success: 'Preferences saved' });
  const test = useAction(sendTestNotificationAction, {
    success: (result) => `Test email sent to ${result.recipient}`,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Preferences</CardTitle>
        <Switch
          aria-label="Enable notifications"
          checked={settings.enabled}
          onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="recipient"
            label="Notification email"
            hint="Falls back to SECURITY_ALERT_EMAIL, then ADMIN_EMAIL."
          >
            <Input
              id="recipient"
              type="email"
              value={settings.recipient ?? ''}
              onChange={(event) => setSettings({ ...settings, recipient: event.target.value })}
            />
          </Field>
          <Field id="min-severity" label="Minimum severity">
            <Select
              value={settings.minSeverity}
              onValueChange={(value) =>
                setSettings({ ...settings, minSeverity: value as Severity })
              }
            >
              <SelectTrigger id="min-severity" className="capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity} className="capitalize">
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="divide-y rounded-md border">
          {(
            Object.entries(NOTIFICATION_CATEGORIES) as [
              NotificationCategory,
              { label: string; description: string },
            ][]
          ).map(([key, category]) => (
            <div key={key} className="flex items-center justify-between gap-4 px-3 py-2.5">
              <Label htmlFor={`category-${key}`} className="block font-normal">
                {category.label}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {category.description}
                </span>
              </Label>
              <Switch
                id={`category-${key}`}
                checked={settings.categories[key]}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    categories: { ...settings.categories, [key]: checked },
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={test.pending || !hasProvider}
            onClick={() => test.run({})}
          >
            <Send />
            Send test email
          </Button>
          <Button disabled={save.pending} onClick={() => save.run(settings)}>
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RetryButton({ id }: { id: string }) {
  const retry = useAction(retryNotificationAction, { success: 'Retrying delivery' });
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label="Retry delivery"
      disabled={retry.pending}
      onClick={() => retry.run({ id })}
    >
      <RotateCw className="size-4" />
    </Button>
  );
}
