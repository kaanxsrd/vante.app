import type { Metadata } from 'next';
import { requireAdminPage } from '@/features/auth/session';
import { getSetting } from '@/features/settings/service';
import { CopyEditor } from './_components/copy-editor';

export const metadata: Metadata = { title: 'Site Text' };

export default async function SiteTextPage() {
  await requireAdminPage();
  return <CopyEditor initial={await getSetting('copy')} />;
}
