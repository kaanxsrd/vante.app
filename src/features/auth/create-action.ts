import 'server-only';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { ActionResult } from '@/lib/validation';
import { type AdminSession, requireAdminAction, UnauthorizedError } from './session';

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

export function adminAction<Schema extends z.ZodType, Result>(
  schema: Schema,
  handler: (input: z.output<Schema>, admin: AdminSession) => Promise<Result>,
) {
  return async (raw: z.input<Schema>): Promise<ActionResult<Result>> => {
    let admin: AdminSession;
    try {
      admin = await requireAdminAction();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return { ok: false, error: 'Your session has expired. Sign in again.' };
      }
      throw error;
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input',
        fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
          string,
          string[] | undefined
        >,
      };
    }

    try {
      return { ok: true, data: await handler(parsed.data, admin) };
    } catch (error) {
      if (error instanceof ActionError) return { ok: false, error: error.message };
      logger.error('admin action failed', { error });
      return { ok: false, error: 'Something went wrong. Check the server logs.' };
    }
  };
}
