import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { adminBasePath, getEnv } from '@/lib/env';
import { getAuth } from './auth';

export interface AdminSession {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
}

function isAdminEmail(email: string): boolean {
  const allowed = getEnv().ADMIN_EMAIL;
  return Boolean(allowed) && email.toLowerCase() === allowed?.toLowerCase();
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!adminBasePath()) return null;
  try {
    const result = await getAuth().api.getSession({ headers: await headers() });
    if (!result || !isAdminEmail(result.user.email)) return null;
    return {
      userId: result.user.id,
      sessionId: result.session.id,
      email: result.user.email,
      name: result.user.name,
    };
  } catch {
    return null;
  }
});

export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (session) return session;
  const base = adminBasePath();
  if (!base) notFound();
  redirect(`${base}/login`);
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function requireAdminAction(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
