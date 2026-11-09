import { getTopPages, getWebsiteSummary } from '@/features/analytics/queries';
import { jsonData } from '@/features/api-platform/http';
import { apiRoute } from '@/features/api-platform/route';
import { parseDateRange } from '@/lib/date-range';

export const runtime = 'nodejs';

export const GET = apiRoute(
  { endpoint: '/api/v1/analytics/summary', scope: 'analytics:read' },
  async ({ request }) => {
    const range = parseDateRange({ range: request.nextUrl.searchParams.get('range') ?? undefined });
    const [summary, topPages] = await Promise.all([
      getWebsiteSummary(range),
      getTopPages(range, 10),
    ]);
    return jsonData({
      range: { preset: range.preset, from: range.from, to: range.to },
      ...summary,
      topPages: topPages.map((page) => ({
        path: page.name,
        views: page.views,
        visitors: page.visitors,
      })),
    });
  },
);
