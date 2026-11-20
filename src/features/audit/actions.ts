/**
 * Every action this app records. groundwork rejects actions it wasn't told about, so recording
 * an action missing from this list fails to compile instead of being lost at runtime.
 */
export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.password_change',
  'auth.session_revoke',
  'auth.session_revoke_all',
  'auth.2fa_enable',
  'auth.2fa_disable',
  'auth.2fa_backup_codes',
  'author.create',
  'author.update',
  'author.delete',
  'media.upload',
  'media.delete',
  'post.create',
  'post.update',
  'post.delete',
  'post.publish',
  'post.unpublish',
  'project.create',
  'project.update',
  'project.delete',
  'project.publish',
  'project.unpublish',
  'project.reorder',
  'security.confirm_threat',
  'security.event_status',
  'security.ip_rule',
  'security.ip_rule_delete',
  'security.rule_update',
  'settings.analytics',
  'settings.analytics_purge',
  'settings.copy',
  'settings.notifications',
  'settings.profile',
  'settings.retention',
  // Recorded by this app before groundwork took over API-key changes; kept so old entries stay
  // queryable. groundwork records the other api_key.* actions itself.
  'api_key.auto_suspend',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
