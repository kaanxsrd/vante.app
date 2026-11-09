import type { Metadata } from 'next';
import { requireAdminPage } from '@/features/auth/session';
import { ProjectEditor } from '../_components/project-editor';

export const metadata: Metadata = { title: 'New project' };

export default async function NewProjectPage() {
  await requireAdminPage();
  return (
    <ProjectEditor
      initial={{
        title: '',
        slug: '',
        description: '',
        content: '',
        category: '',
        thumbnail: '',
        gallery: [],
        frontend: [],
        backend: [],
        tags: [],
        githubUrl: '',
        liveUrl: '',
        links: [],
        featured: false,
        status: 'draft',
        seoTitle: '',
        seoDescription: '',
        ogImage: '',
      }}
    />
  );
}
