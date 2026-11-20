import { closeDatabase } from '@/db';
import { jobs } from '@/lib/jobs';
// Defines every job and schedule.
import '@/features/jobs/scheduler';

const stop = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => stop.abort());
}

console.log('Worker started.');
const summary = await jobs.work({ concurrency: 4, pollInterval: '5s', signal: stop.signal });
console.log(`Worker stopped after ${summary.completed} jobs (${summary.failed} failed).`);
await closeDatabase();
