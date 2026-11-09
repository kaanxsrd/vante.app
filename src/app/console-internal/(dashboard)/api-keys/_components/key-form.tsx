'use client';

import { useState } from 'react';
import { Field, TagInput } from '@/components/admin/content-fields';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { API_SCOPE_NAMES, API_SCOPES, type ApiScope } from '@/features/api-keys/scopes';

export interface KeyPolicyValues {
  name: string;
  description: string;
  scopes: ApiScope[];
  rateLimitPerMinute: number;
  dailyQuota: number | null;
  allowedOrigins: string[];
  allowedIps: string[];
  expectedCountries: string[];
  expiresAt: string | null;
}

export const DEFAULT_POLICY: KeyPolicyValues = {
  name: '',
  description: '',
  scopes: ['posts:read', 'projects:read'],
  rateLimitPerMinute: 60,
  dailyQuota: null,
  allowedOrigins: [],
  allowedIps: [],
  expectedCountries: [],
  expiresAt: null,
};

export function KeyForm({
  values,
  onChange,
}: {
  values: KeyPolicyValues;
  onChange: (next: KeyPolicyValues) => void;
}) {
  const set = <K extends keyof KeyPolicyValues>(key: K, value: KeyPolicyValues[K]) =>
    onChange({ ...values, [key]: value });
  const [quotaOn, setQuotaOn] = useState(values.dailyQuota !== null);

  return (
    <div className="space-y-4">
      <Field id="key-name" label="Name">
        <Input
          id="key-name"
          value={values.name}
          placeholder="Production website"
          onChange={(event) => set('name', event.target.value)}
        />
      </Field>
      <Field id="key-description" label="Description">
        <Textarea
          id="key-description"
          rows={2}
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Permissions</legend>
        <div className="divide-y rounded-md border">
          {API_SCOPE_NAMES.map((scope) => (
            <div key={scope} className="flex items-center justify-between gap-3 px-3 py-2">
              <Label htmlFor={`scope-${scope}`} className="block font-normal">
                <code className="text-xs">{scope}</code>
                <span className="block text-xs text-muted-foreground">{API_SCOPES[scope]}</span>
              </Label>
              <Switch
                id={`scope-${scope}`}
                checked={values.scopes.includes(scope)}
                onCheckedChange={(checked) =>
                  set(
                    'scopes',
                    checked
                      ? [...values.scopes, scope]
                      : values.scopes.filter((item) => item !== scope),
                  )
                }
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="key-rate" label="Requests per minute">
          <Input
            id="key-rate"
            type="number"
            min={1}
            max={10000}
            value={values.rateLimitPerMinute}
            onChange={(event) => set('rateLimitPerMinute', Number(event.target.value))}
          />
        </Field>
        <Field id="key-expiry" label="Expires (UTC)" hint="Leave empty for no expiry.">
          <Input
            id="key-expiry"
            type="datetime-local"
            value={values.expiresAt?.slice(0, 16) ?? ''}
            onChange={(event) =>
              set('expiresAt', event.target.value ? `${event.target.value}:00.000Z` : null)
            }
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="key-quota-on">Daily request quota</Label>
          <Switch
            id="key-quota-on"
            checked={quotaOn}
            onCheckedChange={(checked) => {
              setQuotaOn(checked);
              set('dailyQuota', checked ? 10_000 : null);
            }}
          />
        </div>
        {quotaOn && (
          <Input
            aria-label="Daily quota"
            type="number"
            min={1}
            value={values.dailyQuota ?? ''}
            onChange={(event) => set('dailyQuota', Number(event.target.value))}
          />
        )}
      </div>

      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Restrictions</summary>
        <div className="mt-3 space-y-4">
          <Field
            id="key-origins"
            label="Allowed origins"
            hint="Requests with any other Origin header are rejected. Empty means unrestricted."
          >
            <TagInput
              id="key-origins"
              value={values.allowedOrigins}
              placeholder="https://example.com"
              onChange={(next) => set('allowedOrigins', next)}
            />
          </Field>
          <Field
            id="key-ips"
            label="Allowed IP addresses"
            hint="Empty means any address may use this key."
          >
            <TagInput
              id="key-ips"
              value={values.allowedIps}
              placeholder="203.0.113.10"
              onChange={(next) => set('allowedIps', next)}
            />
          </Field>
          <Field
            id="key-countries"
            label="Expected countries"
            hint="Two-letter codes. Other countries raise an anomaly but are not blocked, because IP geolocation is approximate."
          >
            <TagInput
              id="key-countries"
              value={values.expectedCountries}
              placeholder="DK"
              onChange={(next) => set('expectedCountries', next)}
            />
          </Field>
        </div>
      </details>
    </div>
  );
}
