export const API_SCOPES = {
  'posts:read': 'Read published blog posts',
  'posts:write': 'Create, update and delete blog posts',
  'projects:read': 'Read published projects',
  'projects:write': 'Create, update and delete projects',
  'analytics:read': 'Read website analytics summaries',
} as const;

export type ApiScope = keyof typeof API_SCOPES;

export const API_SCOPE_NAMES = Object.keys(API_SCOPES) as [ApiScope, ...ApiScope[]];
