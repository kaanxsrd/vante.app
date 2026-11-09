import type { Metadata } from 'next';
import { Pagination } from '@/components/admin/filters';
import { requireAdminPage } from '@/features/auth/session';
import { listMedia } from '@/features/media/service';
import { pageFrom, type SearchParams } from '@/lib/search-params';
import { MediaLibrary } from './_components/media-library';

export const metadata: Metadata = { title: 'Media' };

const MEDIA_PAGE_SIZE = 48;

export default async function MediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage();
  const page = pageFrom(await searchParams);
  const { rows, total } = await listMedia({ page, pageSize: MEDIA_PAGE_SIZE });

  return (
    <>
      <MediaLibrary
        items={rows.map((row) => ({
          id: row.id,
          url: row.url,
          filename: row.filename,
          contentType: row.contentType,
          size: row.size,
        }))}
      />
      <Pagination page={page} total={total} pageSize={MEDIA_PAGE_SIZE} />
    </>
  );
}
