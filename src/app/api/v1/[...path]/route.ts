import { apiRoute } from '@/features/api-platform/route';

export const runtime = 'nodejs';

const handler = apiRoute<{ path: string[] }>(
  { endpoint: '/api/v1/*', notFound: true },
  async () => new Response(null, { status: 404 }),
);

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT };
