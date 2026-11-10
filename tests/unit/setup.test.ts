import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { DEFAULT_COPY, isCopyGroupBlank } from '@/features/copy/schema';
import { setupStageFor } from '@/features/setup/queries';

describe('isCopyGroupBlank', () => {
  test('a page with no saved text counts as blank', () => {
    expect(isCopyGroupBlank(DEFAULT_COPY, 'contact')).toBe(true);
  });

  test('built-in fallback text does not count as filled in', () => {
    expect(isCopyGroupBlank(DEFAULT_COPY, 'music')).toBe(true);
  });

  test('one saved field means blanks on that page are deliberate', () => {
    expect(isCopyGroupBlank({ ...DEFAULT_COPY, 'contact.heading': 'Hi' }, 'contact')).toBe(false);
  });

  test('text saved for another page does not count', () => {
    expect(isCopyGroupBlank({ ...DEFAULT_COPY, 'home.todayHeading': 'Hi' }, 'contact')).toBe(true);
  });
});

const queryError = (code: string) =>
  new Error('Failed query', { cause: Object.assign(new Error('driver error'), { code }) });

describe('setupStageFor', () => {
  const original = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
  });

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  test('a missing database address points at the settings file', () => {
    delete process.env.DATABASE_URL;
    expect(setupStageFor(new Error('DATABASE_URL is not set'))).toBe('environment');
  });

  test('an unreachable or rejected database points at starting it', () => {
    for (const code of ['ECONNREFUSED', 'ENOTFOUND', 'CONNECT_TIMEOUT', '28P01', '3D000']) {
      expect(setupStageFor(queryError(code))).toBe('database');
    }
  });

  test('a missing table points at the migrations', () => {
    expect(setupStageFor(queryError('42P01'))).toBe('migrations');
  });

  test('real query bugs are not mistaken for setup problems', () => {
    expect(setupStageFor(queryError('42601'))).toBeNull();
    expect(setupStageFor(new Error('something else'))).toBeNull();
  });
});
