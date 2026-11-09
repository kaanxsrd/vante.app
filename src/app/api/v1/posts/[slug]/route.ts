import { displayPrefix } from '@/features/api-keys/crypto';
import { ApiError, jsonData, readJsonBody } from '@/features/api-platform/http';
import { apiRoute } from '@/features/api-platform/route';
import { postDetail } from '@/features/api-platform/serializers';
import { getPublishedPost } from '@/features/blog/queries';
import { postInputSchema } from '@/features/blog/schema';
import {
  deletePost,
  getPostBySlug,
  PostConflictError,
  UnknownAuthorError,
  updatePost,
} from '@/features/blog/service';
import { revalidatePublicContent } from '@/features/content/revalidate';
import { patchSchema } from '@/lib/validation';

export const runtime = 'nodejs';

const ENDPOINT = '/api/v1/posts/:slug';
type Params = { slug: string };

const notFound = () => new ApiError(404, 'not_found', 'No post with that slug.');

export const GET = apiRoute<Params>(
  { endpoint: ENDPOINT, scope: 'posts:read' },
  async ({ params }) => {
    const post = await getPublishedPost(params.slug);
    if (!post) throw notFound();
    return jsonData(postDetail(post));
  },
);

export const PATCH = apiRoute<Params>(
  { endpoint: ENDPOINT, scope: 'posts:write' },
  async ({ request, params, key }) => {
    const existing = await getPostBySlug(params.slug);
    if (!existing) throw notFound();

    const patch = await readJsonBody(request, patchSchema(postInputSchema));
    const input = postInputSchema.parse({ ...existing, ...patch });

    try {
      const post = await updatePost(existing.id, input, `api-key:${displayPrefix(key.prefix)}`);
      if (!post) throw notFound();
      revalidatePublicContent();
      return jsonData(postDetail(post));
    } catch (error) {
      if (error instanceof PostConflictError) throw new ApiError(409, 'slug_taken', error.message);
      if (error instanceof UnknownAuthorError) {
        throw new ApiError(422, 'unknown_author', error.message);
      }
      throw error;
    }
  },
);

export const DELETE = apiRoute<Params>(
  { endpoint: ENDPOINT, scope: 'posts:write' },
  async ({ params, key }) => {
    const existing = await getPostBySlug(params.slug);
    if (!existing) throw notFound();
    await deletePost(existing.id, `api-key:${displayPrefix(key.prefix)}`);
    revalidatePublicContent();
    return new Response(null, { status: 204 });
  },
);
