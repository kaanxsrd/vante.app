import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BrandMark } from '@/components/admin/brand-mark';
import { getAdminSession } from '@/features/auth/session';
import { getSiteProfile } from '@/features/profile/queries';
import { adminBasePath } from '@/lib/env';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const base = adminBasePath();
  if (!base) notFound();
  if (await getAdminSession()) redirect(base);
  const profile = await getSiteProfile();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark
            name={profile.siteName || profile.name}
            logo={profile.logo}
            className="mb-3 size-10 text-sm"
          />
          <h1 className="text-lg font-semibold tracking-tight">Control center</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
