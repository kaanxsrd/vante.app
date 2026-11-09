import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPage } from '@/features/auth/session';
import { listAuthorOptions } from '@/features/authors/queries';
import { getPostById } from '@/features/blog/service';
import { PostEditor } from '../_components/post-editor';

export const metadata: Metadata = { title: 'Edit post' };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [post, authors] = await Promise.all([getPostById(id), listAuthorOptions()]);
  if (!post) notFound();

  return (
    <PostEditor
      key={post.updatedAt.toISOString()}
      id={post.id}
      authors={authors}
      initial={{
        title: post.title,
        slug: post.slug,
        description: post.description,
        content: post.content,
        author: post.author ?? '',
        category: post.category ?? '',
        tags: post.tags,
        thumbnail: post.thumbnail ?? '',
        featured: post.featured,
        status: post.status,
        publishedAt: post.publishedAt?.toISOString().slice(0, 16) ?? '',
        seoTitle: post.seoTitle ?? '',
        seoDescription: post.seoDescription ?? '',
        ogImage: post.ogImage ?? '',
      }}
    />
  );
}
