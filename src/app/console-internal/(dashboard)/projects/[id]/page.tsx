import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPage } from '@/features/auth/session';
import { getProjectById } from '@/features/projects/service';
import { ProjectEditor } from '../_components/project-editor';

export const metadata: Metadata = { title: 'Edit project' };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <ProjectEditor
      key={project.updatedAt.toISOString()}
      id={project.id}
      initial={{
        title: project.title,
        slug: project.slug,
        description: project.description,
        content: project.content,
        category: project.category,
        thumbnail: project.thumbnail ?? '',
        gallery: project.gallery,
        frontend: project.frontend,
        backend: project.backend,
        tags: project.tags,
        githubUrl: project.githubUrl ?? '',
        liveUrl: project.liveUrl ?? '',
        links: project.links,
        featured: project.featured,
        status: project.status,
        seoTitle: project.seoTitle ?? '',
        seoDescription: project.seoDescription ?? '',
        ogImage: project.ogImage ?? '',
      }}
    />
  );
}
