const MAX_TRACKED_KEYS = 10_000;

interface ThrottleEntry {
  last: number;
  trailing: boolean;
}

export function createTrailingThrottle(spacingMs: number) {
  const entries = new Map<string, ThrottleEntry>();

  return async function run(key: string, task: () => Promise<void>): Promise<void> {
    if (entries.size > MAX_TRACKED_KEYS) entries.clear();

    const entry = entries.get(key) ?? { last: 0, trailing: false };
    entries.set(key, entry);

    const wait = entry.last + spacingMs - Date.now();
    if (wait <= 0) {
      entry.last = Date.now();
      await task();
      return;
    }

    if (entry.trailing) return;
    entry.trailing = true;
    await new Promise((resolve) => setTimeout(resolve, wait));
    entry.trailing = false;
    entry.last = Date.now();
    await task();
  };
}
