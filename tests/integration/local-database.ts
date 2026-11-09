const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const url = process.env.TEST_DATABASE_URL ?? 'postgres://vante:vante@localhost:54329/vante';

if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
  throw new Error('Integration tests refuse to run against a database that is not local.');
}

process.env.DATABASE_URL = url;
