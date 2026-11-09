import { and, eq } from 'drizzle-orm';
import { closeDatabase, db } from '@/db';
import { account, session, twoFactor, user } from '@/db/schema';
import { getAuth } from '@/features/auth/auth';
import { PASSWORD_MIN_LENGTH } from '@/features/auth/constants';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error('ADMIN_EMAIL is not set');
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD || prompt('Admin password:')?.trim() || '';
if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`The password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  process.exit(1);
}

try {
  const context = await getAuth().$context;
  const hash = await context.password.hash(password);
  const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing) {
    await db
      .update(account)
      .set({ password: hash, updatedAt: new Date() })
      .where(and(eq(account.userId, existing.id), eq(account.providerId, 'credential')));
    await db.delete(session).where(eq(session.userId, existing.id));
    if (process.argv.includes('--reset-2fa')) {
      await db.delete(twoFactor).where(eq(twoFactor.userId, existing.id));
      await db.update(user).set({ twoFactorEnabled: false }).where(eq(user.id, existing.id));
      console.log('Two-factor login was turned off.');
    }
    console.log(`Password reset for ${email}. All existing sessions were signed out.`);
  } else {
    const created = await context.internalAdapter.createUser(
      { email, name: 'Admin', emailVerified: true },
      { method: 'admin' },
    );
    await context.internalAdapter.linkAccount({
      accountId: created.id,
      providerId: 'credential',
      userId: created.id,
      password: hash,
    });
    console.log(`Admin account created for ${email}.`);
  }
} finally {
  await closeDatabase();
}
