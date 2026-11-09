import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AdminPathProvider } from '@/components/admin/admin-path';
import { ThemeProvider } from '@/components/theme-provider';
import { getSiteProfile } from '@/features/profile/queries';
import { adminBasePath } from '@/lib/env';
import { cabinetGrotesk, clashDisplay } from '../fonts';
import '../globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { favicon } = await getSiteProfile();
  return {
    title: { default: 'Control center', template: '%s · Control center' },
    robots: { index: false, follow: false, nocache: true },
    referrer: 'no-referrer',
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };
}

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const basePath = adminBasePath();
  if (!basePath) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${GeistMono.variable} ${clashDisplay.variable} ${cabinetGrotesk.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
          <AdminPathProvider basePath={basePath}>{children}</AdminPathProvider>
          <Toaster position="bottom-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
