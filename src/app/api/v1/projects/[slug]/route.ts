import { displayPrefix } from '@/features/api-keys/crypto';
import { ApiError, jsonData, readJsonBody } from '@/features/api-platform/http';
import { apiRoute } from '@/features/api-platform/route';
import { projectDetail } from '@/features/api-platform/serializers';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { getPublishedProject } from '@/features/projects/queries';
import { projectInputSchema } from '@/features/projects/schema';
import {
  deleteProject,
  getProjectBySlug,
  ProjectConflictError,
  updateProject,
} from '@/features/projects/service';
import { patchSchema } from '@/lib/validation';

export const runtime = 'nodejs';

const ENDPOINT = '/api/v1/projects/:slug';
type Params = { slug: string };

const notFound = () => new ApiError(404, 'not_found', 'No project with that slug.');

export const GET = apiRoute<Params>(
  { endpoint: ENDPOINT, scope: 'projects:read' },
  async ({ params }) => {
    const project = await getPublishedProject(params.slug);
    if (!project) throw notFound();
    return jsonData(projectDetail(project));
  },
);

export const PATCH = apiRoute<Params>(
  { endpoint: ENDPOINT, scope: 'projects:write' },
  async ({ request, params, key }) => {
    const existing = await getProjectBySlug(params.slug);
    if (!existing) throw notFound();

    const patch = await readJsonBody(request, patchSchema(projectInputSchema));
    const input = projectInputSchema.parse({ ...existing, ...patch });

    try {
      const project = await updateProject(
        existing.id,
        input,
        `api-key:${displayPrefix(key.prefix)}`,
      );
      if (!project) throw notFound();
      revalidatePublicContent();
      return jsonData(projectDetail(project));
    } catch (error) {
      if (error instanceof ProjectConflictError) {
        throw new ApiError(409, 'slug_taken', error.message);
      }
      throw error;
    }
  },
);

export const DELETE = apiRoute<Params>(
  { endpoint: ENDPOINT, scope: 'projects:write' },
  async ({ params, key }) => {
    const existing = await getProjectBySlug(params.slug);
    if (!existing) throw notFound();
    await deleteProject(existing.id, `api-key:${displayPrefix(key.prefix)}`);
    revalidatePublicContent();
    return new Response(null, { status: 204 });
  },
);
