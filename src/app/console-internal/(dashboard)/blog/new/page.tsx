import type { Metadata } from 'next';
import { requireAdminPage } from '@/features/auth/session';
import { listAuthorOptions } from '@/features/authors/queries';
import { PostEditor, type PostFormValues } from '../_components/post-editor';

export const metadata: Metadata = { title: 'New post' };

const EMPTY_POST: PostFormValues = {
  title: '',
  slug: '',
  description: '',
  content: '',
  author: '',
  category: '',
  tags: [],
  thumbnail: '',
  featured: false,
  status: 'draft',
  publishedAt: '',
  seoTitle: '',
  seoDescription: '',
  ogImage: '',
};

export default async function NewPostPage() {
  await requireAdminPage();
  const authors = await listAuthorOptions();
  return (
    <PostEditor initial={{ ...EMPTY_POST, author: authors[0]?.slug ?? '' }} authors={authors} />
  );
}
