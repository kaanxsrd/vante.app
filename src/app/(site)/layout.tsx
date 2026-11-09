import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AnalyticsTracker } from '@/components/site/analytics-tracker';
import SiteNavbar from '@/components/site/site-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getCopy } from '@/features/copy/queries';
import { getSiteIcons } from '@/features/icons/queries';
import { getSiteProfile } from '@/features/profile/queries';
import { siteUrl } from '@/lib/env';
import { cabinetGrotesk, clashDisplay } from '../fonts';
import '../globals.css';

export const viewport: Viewport = {
  themeColor: 'black',
};

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { name, siteName, description, keywords, favicon } = await getSiteProfile();
  const url = siteUrl();
  return {
    metadataBase: new URL(url),
    title: { default: name, template: name ? `%s - ${name}` : '%s' },
    description,
    keywords,
    authors: [{ name, url }],
    creator: name,
    ...(favicon ? { icons: { icon: favicon } } : {}),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url,
      title: name,
      description,
      siteName: siteName || name,
    },
  };
}

export default async function SiteLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [profile, copy] = await Promise.all([getSiteProfile(), getCopy()]);
  const icons = await getSiteIcons(
    [...profile.navigation, ...profile.socials].map((item) => item.icon),
  );

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${GeistMono.variable} ${clashDisplay.variable} ${cabinetGrotesk.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={0}>
            {children}
            <SiteNavbar
              navigation={profile.navigation}
              socials={profile.socials}
              icons={icons}
              themeLabel={copy['nav.themeLabel']}
            />
          </TooltipProvider>
        </ThemeProvider>
        <AnalyticsTracker />
      </body>
    </html>
  );
}
