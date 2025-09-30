import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { siteConfig } from '@/lib/site';
import { metadataKeywords } from './metadata';
import '@/app/globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import SiteNavbar from '@/components/site-nav';

export const viewport: Viewport = {
  themeColor: 'black',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: metadataKeywords,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <TooltipProvider delayDuration={0}>
          {children}
          <SiteNavbar />
        </TooltipProvider>
      </body>
    </html>
  );
}
