import 'server-only';
import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { session, user } from '@/db/schema';
import type { AdminSession } from './session';

export async function listActiveSessions(admin: AdminSession) {
  const rows = await db
    .select({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .where(and(eq(session.userId, admin.userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt));
  return rows.map((row) => ({ ...row, current: row.id === admin.sessionId }));
}

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: user.twoFactorEnabled })
    .from(user)
    .where(eq(user.id, userId));
  return row?.enabled ?? false;
}
