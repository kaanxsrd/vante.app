const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

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
