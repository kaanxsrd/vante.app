export type ApiKeyState = 'active' | 'suspended' | 'expired' | 'revoked';

export interface KeyLifecycle {
  revokedAt: Date | null;
  expiresAt: Date | null;
  suspendedUntil: Date | null;
}

export function apiKeyState(key: KeyLifecycle, now: Date = new Date()): ApiKeyState {
  if (key.revokedAt) return 'revoked';
  if (key.expiresAt && key.expiresAt <= now) return 'expired';
  if (key.suspendedUntil && key.suspendedUntil > now) return 'suspended';
  return 'active';
}
