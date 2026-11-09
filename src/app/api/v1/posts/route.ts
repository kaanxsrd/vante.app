import { displayPrefix } from '@/features/api-keys/crypto';
import { ApiError, jsonData, paginationFrom, readJsonBody } from '@/features/api-platform/http';
import { apiRoute } from '@/features/api-platform/route';
import { postDetail, postSummary } from '@/features/api-platform/serializers';
import { getDefaultAuthorSlug } from '@/features/authors/queries';
import { getPublishedPosts } from '@/features/blog/queries';
import { postInputSchema } from '@/features/blog/schema';
import { createPost, PostConflictError, UnknownAuthorError } from '@/features/blog/service';
import { revalidatePublicContent } from '@/features/content/revalidate';

export const runtime = 'nodejs';

export const GET = apiRoute(
  { endpoint: '/api/v1/posts', scope: 'posts:read' },
  async ({ request }) => {
    const { limit, offset } = paginationFrom(request.nextUrl);
    const posts = await getPublishedPosts();
    return jsonData(posts.slice(offset, offset + limit).map(postSummary), {
      meta: { total: posts.length, limit, offset },
    });
  },
);

export const POST = apiRoute(
  { endpoint: '/api/v1/posts', scope: 'posts:write' },
  async ({ request, key }) => {
    const input = await readJsonBody(request, postInputSchema);
    try {
      const post = await createPost(
        { ...input, author: input.author ?? (await getDefaultAuthorSlug()) },
        `api-key:${displayPrefix(key.prefix)}`,
      );
      revalidatePublicContent();
      return jsonData(postDetail(post), { status: 201 });
    } catch (error) {
      if (error instanceof PostConflictError) throw new ApiError(409, 'slug_taken', error.message);
      if (error instanceof UnknownAuthorError) {
        throw new ApiError(422, 'unknown_author', error.message);
      }
      throw error;
    }
  },
);
