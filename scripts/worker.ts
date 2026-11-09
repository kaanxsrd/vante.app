import { closeDatabase } from '@/db';
import { runBackgroundTick } from '@/features/jobs/scheduler';

const TICK_MS = 15_000;
let running = true;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    running = false;
  });
}

console.log('Worker started.');
while (running) {
  try {
    const processed = await runBackgroundTick({ budgetMs: 10_000 });
    if (processed > 0) console.log(`Processed ${processed} jobs.`);
  } catch (error) {
    console.error('Worker tick failed:', error instanceof Error ? error.message : error);
  }
  await Bun.sleep(TICK_MS);
}

await closeDatabase();
console.log('Worker stopped.');
