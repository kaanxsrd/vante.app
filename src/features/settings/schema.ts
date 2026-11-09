import { z } from 'zod';
import type { SiteCopy } from '@/features/copy/fields';
import { copySchema, DEFAULT_COPY } from '@/features/copy/schema';
import { DEFAULT_PROFILE, profileSchema, type SiteProfile } from '@/features/profile/schema';

export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const severitySchema = z.enum(SEVERITIES);

export const NOTIFICATION_CATEGORIES = {
  key_compromise: {
    label: 'Potential API key compromise',
    description: 'A key used from many networks, or a revoked key that still gets traffic.',
  },
  geo: {
    label: 'Suspicious geographic activity',
    description: 'A key seen from a new or unexpected country. Often a VPN or a travelling user.',
  },
  spike: {
    label: 'Unusual request spikes',
    description: 'Traffic well above the normal level for a key or for the whole API.',
  },
  auth_failures: {
    label: 'Repeated authentication failures',
    description: 'Repeated failed sign-ins to this dashboard.',
  },
  invalid_key: {
    label: 'Invalid API key abuse',
    description: 'Repeated requests with keys that do not exist.',
  },
  abuse: {
    label: 'Policy violations and scanning',
    description: 'Rate-limit abuse, blocked origins and IPs, and endpoint probing.',
  },
  service_failure: {
    label: 'API service failures',
    description: 'The API is returning an elevated rate of server errors.',
  },
} as const;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

const categoryShape = Object.fromEntries(
  Object.keys(NOTIFICATION_CATEGORIES).map((key) => [key, z.boolean()]),
) as Record<NotificationCategory, z.ZodBoolean>;

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  recipient: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.email('Enter a valid email address').nullable(),
  ),
  minSeverity: severitySchema,
  categories: z.object(categoryShape),
});

export const analyticsSettingsSchema = z.object({
  enabled: z.boolean(),
  retentionDays: z.number().int().min(7).max(730),
});

export const retentionSettingsSchema = z.object({
  apiRequestDays: z.number().int().min(7).max(730),
  securityEventDays: z.number().int().min(30).max(1825),
  auditLogDays: z.number().int().min(30).max(1825),
  notificationDays: z.number().int().min(7).max(730),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type AnalyticsSettings = z.infer<typeof analyticsSettingsSchema>;
export type RetentionSettings = z.infer<typeof retentionSettingsSchema>;

export const SETTINGS_SCHEMAS = {
  notifications: notificationSettingsSchema,
  analytics: analyticsSettingsSchema,
  retention: retentionSettingsSchema,
  profile: profileSchema,
  copy: copySchema,
} as const;

export interface SettingsMap {
  notifications: NotificationSettings;
  analytics: AnalyticsSettings;
  retention: RetentionSettings;
  profile: SiteProfile;
  copy: SiteCopy;
}

export const SETTINGS_DEFAULTS: SettingsMap = {
  profile: DEFAULT_PROFILE,
  copy: DEFAULT_COPY,
  notifications: {
    enabled: true,
    recipient: null,
    minSeverity: 'medium',
    categories: {
      key_compromise: true,
      geo: true,
      spike: true,
      auth_failures: true,
      invalid_key: true,
      abuse: true,
      service_failure: true,
    },
  },
  analytics: { enabled: true, retentionDays: 365 },
  retention: {
    apiRequestDays: 90,
    securityEventDays: 365,
    auditLogDays: 730,
    notificationDays: 180,
  },
};
