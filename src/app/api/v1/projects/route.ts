import { displayPrefix } from '@/features/api-keys/crypto';
import { ApiError, jsonData, paginationFrom, readJsonBody } from '@/features/api-platform/http';
import { apiRoute } from '@/features/api-platform/route';
import { projectDetail, projectSummary } from '@/features/api-platform/serializers';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { getPublishedProjects } from '@/features/projects/queries';
import { projectInputSchema } from '@/features/projects/schema';
import { createProject, ProjectConflictError } from '@/features/projects/service';

export const runtime = 'nodejs';

export const GET = apiRoute(
  { endpoint: '/api/v1/projects', scope: 'projects:read' },
  async ({ request }) => {
    const { limit, offset } = paginationFrom(request.nextUrl);
    const projects = await getPublishedProjects();
    return jsonData(projects.slice(offset, offset + limit).map(projectSummary), {
      meta: { total: projects.length, limit, offset },
    });
  },
);

export const POST = apiRoute(
  { endpoint: '/api/v1/projects', scope: 'projects:write' },
  async ({ request, key }) => {
    const input = await readJsonBody(request, projectInputSchema);
    try {
      const project = await createProject(input, `api-key:${displayPrefix(key.prefix)}`);
      revalidatePublicContent();
      return jsonData(projectDetail(project), { status: 201 });
    } catch (error) {
      if (error instanceof ProjectConflictError) {
        throw new ApiError(409, 'slug_taken', error.message);
      }
      throw error;
    }
  },
);
