import { FileText, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { AdminLink } from '@/components/admin/admin-path';
import { EmptyState } from '@/components/admin/empty-state';
import { Pagination, SearchFilter, SelectFilter } from '@/components/admin/filters';
import { PageHeader } from '@/components/admin/page-header';
import { ContentStatusBadge } from '@/components/admin/status-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireAdminPage } from '@/features/auth/session';
import { CONTENT_STATUSES } from '@/features/blog/schema';
import { listAdminPosts } from '@/features/blog/service';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { oneOf, PAGE_SIZE, pageFrom, type SearchParams, single } from '@/lib/search-params';
import { PostRowActions } from './_components/post-row-actions';

export const metadata: Metadata = { title: 'Blog' };

const STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = pageFrom(params);
  const { rows, total, categories } = await listAdminPosts({
    q: single(params.q),
    status: oneOf(single(params.status), CONTENT_STATUSES),
    category: single(params.category),
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <>
      <PageHeader
        title="Blog"
        description="Write, schedule and publish posts. Changes reach the public site immediately."
        actions={
          <Button asChild>
            <AdminLink href="/blog/new">
              <Plus />
              New post
            </AdminLink>
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchFilter placeholder="Search posts" />
        <SelectFilter param="status" label="Status" options={STATUS_OPTIONS} />
        {categories.length > 0 && (
          <SelectFilter
            param="category"
            label="Category"
            options={categories.map((category) => ({ value: category, label: category }))}
          />
        )}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No posts found"
            description="Try a different search, or write your first post."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-md">
                    <AdminLink
                      href={`/blog/${post.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {post.title}
                    </AdminLink>
                    <p className="truncate font-mono text-xs text-muted-foreground">/{post.slug}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ContentStatusBadge status={post.status} />
                      {post.status === 'published' &&
                        post.publishedAt &&
                        post.publishedAt > new Date() && <Badge variant="outline">Scheduled</Badge>}
                      {post.featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{post.category ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {post.publishedAt ? formatDate(post.publishedAt) : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(post.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <PostRowActions
                      id={post.id}
                      slug={post.slug}
                      title={post.title}
                      status={post.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
      </Card>
    </>
  );
}
