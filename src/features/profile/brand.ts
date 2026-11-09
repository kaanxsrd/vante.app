import 'server-only';
import { getSetting } from '@/features/settings/service';
import type { EmailBrand } from '@/lib/email';
import { siteUrl } from '@/lib/env';

export async function getEmailBrand(): Promise<EmailBrand> {
  const { name, siteName } = await getSetting('profile');
  const url = siteUrl();
  const hostname = new URL(url).hostname;
  return { siteName: siteName || hostname, ownerName: name || siteName || hostname, url };
}
