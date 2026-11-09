export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 25;

export function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

export function pageFrom(params: SearchParams): number {
  const page = Number.parseInt(single(params.page) ?? '1', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function oneOf<const T extends readonly string[]>(
  value: string | undefined,
  options: T,
): T[number] | undefined {
  return value && (options as readonly string[]).includes(value) ? value : undefined;
}

export function rangeParams(params: SearchParams) {
  return {
    range: single(params.range),
    from: single(params.from),
    to: single(params.to),
  };
}
