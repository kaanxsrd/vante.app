const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const UNDEFINED_TABLE = '42P01';
const CONNECTION_FAILURES = [
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'CONNECT_TIMEOUT',
  '28000',
  '28P01',
  '3D000',
];

interface MaybePgError {
  code?: unknown;
  cause?: unknown;
}

function hasPgCode(error: unknown, code: string): boolean {
  let current = error as MaybePgError | undefined;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (current.code === code) return true;
    current = current.cause as MaybePgError | undefined;
  }
  return false;
}

export const isUniqueViolation = (error: unknown) => hasPgCode(error, UNIQUE_VIOLATION);
export const isForeignKeyViolation = (error: unknown) => hasPgCode(error, FOREIGN_KEY_VIOLATION);
export const isMissingTable = (error: unknown) => hasPgCode(error, UNDEFINED_TABLE);
export const isConnectionFailure = (error: unknown) =>
  CONNECTION_FAILURES.some((code) => hasPgCode(error, code));
