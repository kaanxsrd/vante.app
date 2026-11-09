import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

interface DatabaseGlobal {
  __vanteDb?: { client: postgres.Sql; db: Database };
}

const store = globalThis as unknown as DatabaseGlobal;

function connect() {
  if (store.__vanteDb) return store.__vanteDb;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
  const instance = drizzle(client, { schema });
  store.__vanteDb = { client, db: instance };
  return store.__vanteDb;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const instance = connect().db;
    const value = Reflect.get(instance, property);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export async function closeDatabase(): Promise<void> {
  if (!store.__vanteDb) return;
  await store.__vanteDb.client.end({ timeout: 5 });
  store.__vanteDb = undefined;
}
