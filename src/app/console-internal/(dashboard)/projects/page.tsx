import { FolderKanban, Plus } from 'lucide-react';
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
import { listAdminProjects } from '@/features/projects/service';
import { formatRelativeTime } from '@/lib/format';
import { oneOf, PAGE_SIZE, pageFrom, type SearchParams, single } from '@/lib/search-params';
import { ProjectMoveButtons, ProjectRowActions } from './_components/project-row-actions';

export const metadata: Metadata = { title: 'Projects' };

const STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
];

export default async function ProjectsAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = pageFrom(params);
  const { rows, total, categories } = await listAdminProjects({
    q: single(params.q),
    status: oneOf(single(params.status), CONTENT_STATUSES),
    category: single(params.category),
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description="The order here is the order on the public projects page."
        actions={
          <Button asChild>
            <AdminLink href="/projects/new">
              <Plus />
              New project
            </AdminLink>
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchFilter placeholder="Search projects" />
        <SelectFilter param="status" label="Status" options={STATUS_OPTIONS} />
        <SelectFilter
          param="category"
          label="Category"
          options={categories.map((category) => ({ value: category, label: category }))}
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description="Try a different search, or add your first project."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((project, index) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <ProjectMoveButtons
                      id={project.id}
                      title={project.title}
                      isFirst={index === 0 && page === 1}
                      isLast={index === rows.length - 1 && page * PAGE_SIZE >= total}
                    />
                  </TableCell>
                  <TableCell>
                    <AdminLink
                      href={`/projects/${project.id}`}
                      className="block font-medium hover:underline"
                    >
                      {project.title}
                    </AdminLink>
                    <p className="font-mono text-xs text-muted-foreground">/{project.slug}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ContentStatusBadge status={project.status} />
                      {project.featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{project.category}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(project.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <ProjectRowActions
                      id={project.id}
                      slug={project.slug}
                      title={project.title}
                      status={project.status}
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
