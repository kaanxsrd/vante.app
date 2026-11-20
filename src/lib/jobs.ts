import 'server-only';
import { createJobs } from '@vantedev/groundwork/jobs';
import { db } from '@/db';
import { gwJobSchedules, gwJobs } from '@/db/schema';
import { logger } from './logger';

/**
 * The background job queue (groundwork). It needs no secret, so jobs are defined at module scope
 * next to their handlers, and `next build` still runs without production settings. A process only
 * runs the job types it has imported: the worker and the cron route import
 * `@/features/jobs/scheduler`, which pulls in every definition.
 */
export const jobs = createJobs({ db, table: gwJobs, schedulesTable: gwJobSchedules, logger });
