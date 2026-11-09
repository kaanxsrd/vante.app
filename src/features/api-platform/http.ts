import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers: Record<string, string> = {},
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const MAX_BODY_BYTES = 1_048_576;

export async function readJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.output<Schema>> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) {
    throw new ApiError(413, 'payload_too_large', 'Request body is larger than 1 MB.');
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new ApiError(413, 'payload_too_large', 'Request body is larger than 1 MB.');
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'invalid_json', 'Request body is not valid JSON.');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'validation_error',
      'Request body failed validation.',
      {},
      {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    );
  }
  return parsed.data;
}

export function paginationFrom(url: URL, defaults = { limit: 20, maxLimit: 100 }) {
  const limit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const offset = Number.parseInt(url.searchParams.get('offset') ?? '', 10);
  return {
    limit:
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, defaults.maxLimit) : defaults.limit,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0,
  };
}

export function jsonData(data: unknown, init?: ResponseInit & { meta?: unknown }): Response {
  const { meta, ...rest } = init ?? {};
  return Response.json({ data, ...(meta ? { meta } : {}) }, rest);
}
