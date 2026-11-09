import type { Metadata } from 'next';
import { requireAdminPage } from '@/features/auth/session';
import { listAuthorsWithPostCounts } from '@/features/authors/service';
import { AuthorsManager } from './_components/authors-manager';

export const metadata: Metadata = { title: 'Authors' };

export default async function AuthorsPage() {
  await requireAdminPage();
  return <AuthorsManager authors={await listAuthorsWithPostCounts()} />;
}
