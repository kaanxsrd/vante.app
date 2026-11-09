'use server';

import { APIError } from 'better-auth/api';
import { and, eq, ne } from 'drizzle-orm';
import { headers } from 'next/headers';
import { renderSVG } from 'uqr';
import { z } from 'zod';
import { db } from '@/db';
import { session } from '@/db/schema';
import { recordAudit } from '@/features/audit/service';
import { getEmailBrand } from '@/features/profile/brand';
import { getAuth } from './auth';
import { PASSWORD_MIN_LENGTH } from './constants';
import { ActionError, adminAction } from './create-action';

export const changePasswordAction = adminAction(
  z
    .object({
      currentPassword: z.string().min(1, 'Enter your current password').max(128),
      newPassword: z
        .string()
        .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
        .max(128),
    })
    .refine((value) => value.currentPassword !== value.newPassword, {
      message: 'The new password must be different',
      path: ['newPassword'],
    }),
  async ({ currentPassword, newPassword }, admin) => {
    try {
      await getAuth().api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions: true },
        headers: await headers(),
      });
    } catch (error) {
      if (error instanceof APIError) throw new ActionError('Your current password is not correct.');
      throw error;
    }
    await recordAudit({
      actor: admin.email,
      action: 'auth.password_change',
      entityType: 'user',
      entityId: admin.userId,
      summary: 'Changed the admin password and signed out other sessions',
    });
    return null;
  },
);

export const revokeSessionAction = adminAction(
  z.object({ id: z.string().min(1) }),
  async ({ id }, admin) => {
    if (id === admin.sessionId) throw new ActionError('Use Sign out to end this session.');
    const [removed] = await db
      .delete(session)
      .where(and(eq(session.id, id), eq(session.userId, admin.userId)))
      .returning({ id: session.id });
    if (!removed) throw new ActionError('That session has already ended.');
    await recordAudit({
      actor: admin.email,
      action: 'auth.session_revoke',
      entityType: 'session',
      entityId: id,
      summary: 'Revoked another dashboard session',
    });
    return null;
  },
);

export const revokeOtherSessionsAction = adminAction(z.object({}), async (_input, admin) => {
  const removed = await db
    .delete(session)
    .where(and(eq(session.userId, admin.userId), ne(session.id, admin.sessionId)))
    .returning({ id: session.id });
  await recordAudit({
    actor: admin.email,
    action: 'auth.session_revoke_all',
    entityType: 'session',
    summary: `Revoked ${removed.length} other dashboard sessions`,
  });
  return { count: removed.length };
});

const passwordInput = z.object({ password: z.string().min(1, 'Enter your password').max(128) });

function rethrowAuthError(error: unknown, message: string): never {
  if (error instanceof APIError) throw new ActionError(message);
  throw error;
}

export const startTwoFactorSetupAction = adminAction(passwordInput, async ({ password }) => {
  const { siteName: issuer } = await getEmailBrand();
  const result = await getAuth()
    .api.enableTwoFactor({ body: { password, method: 'totp', issuer }, headers: await headers() })
    .catch((error: unknown) => rethrowAuthError(error, 'Your password is not correct.'));

  if (result.method !== 'totp') throw new ActionError('Authenticator setup is not available.');

  const svg = renderSVG(result.totpURI, { border: 2 });
  return {
    qrCode: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    secret: new URL(result.totpURI).searchParams.get('secret') ?? '',
    backupCodes: result.backupCodes,
  };
});

export const confirmTwoFactorSetupAction = adminAction(
  z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code from your app'),
  }),
  async ({ code }, admin) => {
    await getAuth()
      .api.verifyTOTP({ body: { code }, headers: await headers() })
      .catch((error: unknown) =>
        rethrowAuthError(error, 'That code is not valid. Try the next one.'),
      );
    await recordAudit({
      actor: admin.email,
      action: 'auth.2fa_enable',
      entityType: 'user',
      entityId: admin.userId,
      summary: 'Turned on two-factor authentication',
    });
    return null;
  },
);

export const disableTwoFactorAction = adminAction(passwordInput, async ({ password }, admin) => {
  await getAuth()
    .api.disableTwoFactor({ body: { password }, headers: await headers() })
    .catch((error: unknown) => rethrowAuthError(error, 'Your password is not correct.'));
  await recordAudit({
    actor: admin.email,
    action: 'auth.2fa_disable',
    entityType: 'user',
    entityId: admin.userId,
    summary: 'Turned off two-factor authentication',
  });
  return null;
});

export const regenerateBackupCodesAction = adminAction(
  passwordInput,
  async ({ password }, admin) => {
    const { backupCodes } = await getAuth()
      .api.generateBackupCodes({ body: { password }, headers: await headers() })
      .catch((error: unknown) => rethrowAuthError(error, 'Your password is not correct.'));
    await recordAudit({
      actor: admin.email,
      action: 'auth.2fa_backup_codes',
      entityType: 'user',
      entityId: admin.userId,
      summary: 'Generated new two-factor backup codes',
    });
    return { backupCodes };
  },
);
