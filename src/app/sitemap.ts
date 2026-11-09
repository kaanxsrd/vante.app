import type { MetadataRoute } from 'next';
import { getPublishedPosts } from '@/features/blog/queries';
import { getPublishedProjects } from '@/features/projects/queries';
import { siteUrl } from '@/lib/env';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([getPublishedPosts(), getPublishedProjects()]);
  const staticPaths = ['', '/blog', '/projects', '/music', '/contact', '/privacy'];
  const url = siteUrl();

  return [
    ...staticPaths.map((path) => ({ url: `${url}${path}` })),
    ...posts.map((post) => ({
      url: `${url}/blog/${post.slug}`,
      lastModified: post.updatedAt,
    })),
    ...projects.map((project) => ({
      url: `${url}/projects/${project.slug}`,
      lastModified: project.updatedAt,
    })),
  ];
}
