import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AdminLink } from '@/components/admin/admin-path';
import { PostArticle } from '@/components/site/post-article';
import { Button } from '@/components/ui/button';
import { requireAdminPage } from '@/features/auth/session';
import { getPostById } from '@/features/blog/service';

export const metadata: Metadata = { title: 'Preview' };

export default async function PostPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const post = await getPostById(id);
  if (!post) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
        <p className="text-sm text-muted-foreground">
          Previewing as it will appear publicly. Status: {post.status}.
        </p>
        <Button asChild variant="outline" size="sm">
          <AdminLink href={`/blog/${post.id}`}>
            <ArrowLeft />
            Back to editor
          </AdminLink>
        </Button>
      </div>
      <PostArticle post={post} />
    </div>
  );
}
