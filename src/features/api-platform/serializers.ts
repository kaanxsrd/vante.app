import type { PublicPost } from '@/features/blog/queries';
import type { PublicProject } from '@/features/projects/queries';

export function postSummary(post: PublicPost) {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    category: post.category,
    tags: post.tags,
    author: post.author,
    thumbnail: post.thumbnail,
    featured: post.featured,
    readingMinutes: post.readingMinutes,
    status: post.status,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
}

export function postDetail(post: PublicPost) {
  return { ...postSummary(post), content: post.content };
}

export function projectSummary(project: PublicProject) {
  return {
    slug: project.slug,
    title: project.title,
    description: project.description,
    category: project.category,
    thumbnail: project.thumbnail,
    gallery: project.gallery,
    frontend: project.frontend,
    backend: project.backend,
    tags: project.tags,
    githubUrl: project.githubUrl,
    liveUrl: project.liveUrl,
    links: project.links,
    featured: project.featured,
    status: project.status,
    publishedAt: project.publishedAt,
    updatedAt: project.updatedAt,
  };
}

export function projectDetail(project: PublicProject) {
  return { ...projectSummary(project), content: project.content };
}
