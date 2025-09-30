import { ComponentType } from 'react';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';

import { projectDocs, projectMeta } from '@/.source';

export const projectSource = loader({
  baseUrl: '/projects',
  source: createMDXSource(projectDocs, projectMeta),
});

export type ProjectLink = {
  name: string;
  href: string;
};

export interface ProjectFrontmatter {
  title: string;
  description?: string;
  type: string;
  thumbnail: string;
  frontend: string[];
  backend: string[];
  links: ProjectLink[];
}

export interface ProjectContent extends ProjectFrontmatter {
  body: ComponentType;
}

export interface ProjectEntry {
  url: string;
  data: ProjectContent;
}

export const getAllProjects = (): ProjectEntry[] => {
  const pages = projectSource.getPages() as ProjectEntry[];

  return pages.sort((a, b) => a.data.title.localeCompare(b.data.title));
};

export const getProjectBySlug = (slug: string): ProjectEntry | null => {
  try {
    const page = projectSource.getPage([slug]) as ProjectEntry | undefined;
    return page ?? null;
  } catch {
    return null;
  }
};
