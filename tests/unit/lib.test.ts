import { afterEach, describe, expect, test } from 'bun:test';
import { estimateReadingMinutes } from '@/features/content/reading-time';
import { backoffSeconds } from '@/features/jobs/queue';
import { detectImageType, sanitizeFilename } from '@/features/media/validate';
import { shouldNotify } from '@/features/notifications/service';
import { securityAlertEmail } from '@/features/notifications/templates';
import { SETTINGS_DEFAULTS } from '@/features/settings/schema';
import { bucketKey, listBuckets, parseDateRange, zeroFill } from '@/lib/date-range';
import { emailLayout, escapeHtml } from '@/lib/email';
import { adminBasePath, requireSecret, resetEnvCache } from '@/lib/env';
import { formatRelativeTime } from '@/lib/format';
import { redact } from '@/lib/logger';
import { consumeMemoryRateLimit } from '@/lib/rate-limit';
import { getClientIp, getCountry, ipBucket } from '@/lib/request-meta';
import { SLUG_PATTERN, slugify } from '@/lib/slug';
import { createTrailingThrottle } from '@/lib/throttle';

describe('slugify', () => {
  test('basic', () => expect(slugify('Hello, World!')).toBe('hello-world'));
  test('Turkish letters', () =>
    expect(slugify('Karahanlı Şirketi Çağrı')).toBe('karahanli-sirketi-cagri'));
  test('Nordic letters', () => expect(slugify('Æble Øl Århus')).toBe('aeble-ol-arhus'));
  test('always matches the validation pattern', () => {
    for (const title of ['A  B', '-x-', 'Why I Moved (and Stayed)']) {
      expect(slugify(title)).toMatch(SLUG_PATTERN);
    }
  });
});

describe('date ranges', () => {
  const now = new Date('2026-06-15T12:34:56Z');

  test('defaults to 7 days of daily buckets', () => {
    const range = parseDateRange({}, '7d', now);
    expect(range.bucket).toBe('day');
    expect(range.to.getTime() - range.from.getTime()).toBe(7 * 86_400_000);
  });

  test('24 hours uses hourly buckets', () => {
    expect(parseDateRange({ range: '24h' }, '7d', now).bucket).toBe('hour');
  });

  test('an unknown preset falls back', () => {
    expect(parseDateRange({ range: 'bogus' }, '30d', now).preset).toBe('30d');
  });

  test('inherited object keys are not presets', () => {
    const range = parseDateRange({ range: 'constructor' }, '7d', now);
    expect(range.preset).toBe('7d');
    expect(Number.isNaN(range.from.getTime())).toBe(false);
  });

  test('accepts a custom range', () => {
    const range = parseDateRange({ from: '2026-01-01', to: '2026-01-31' }, '7d', now);
    expect(range.preset).toBe('custom');
  });

  test('refuses a reversed custom range', () => {
    expect(parseDateRange({ from: '2026-02-01', to: '2026-01-01' }, '7d', now).preset).toBe('7d');
  });

  test('refuses an absurdly long custom range', () => {
    expect(parseDateRange({ from: '2000-01-01', to: '2026-01-01' }, '7d', now).preset).toBe('7d');
  });

  test('buckets are truncated UTC', () => {
    expect(bucketKey(now, 'hour')).toBe('2026-06-15T12:00:00Z');
    expect(bucketKey(now, 'day')).toBe('2026-06-15T00:00:00Z');
  });

  test('quiet periods draw as zero', () => {
    const range = {
      from: new Date('2026-06-01T00:00:00Z'),
      to: new Date('2026-06-03T12:00:00Z'),
      bucket: 'day' as const,
    };
    expect(listBuckets(range)).toHaveLength(3);
    const filled = zeroFill([{ bucket: '2026-06-02T00:00:00Z', views: 4 }], range, { views: 0 });
    expect(filled.map((row) => row.views)).toEqual([0, 4, 0]);
  });
});

describe('logger redaction', () => {
  test('removes secrets by key name at any depth', () => {
    expect(redact({ a: { password: 'x', apiKey: 'y', nested: { token: 'z' } } })).toEqual({
      a: { password: '[redacted]', apiKey: '[redacted]', nested: { token: '[redacted]' } },
    });
  });

  test('keeps ordinary values', () => {
    expect(redact({ requestId: 'r', status: 200 })).toEqual({ requestId: 'r', status: 200 });
  });

  test('handles cycles by depth limit', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => redact(cyclic)).not.toThrow();
  });
});

describe('memory rate limiter', () => {
  test('allows up to the limit, then refuses', () => {
    const key = `test-${Math.random()}`;
    const results = Array.from(
      { length: 4 },
      () => consumeMemoryRateLimit({ key, limit: 3, windowMs: 60_000 }).allowed,
    );
    expect(results).toEqual([true, true, true, false]);
  });
});

describe('request metadata', () => {
  afterEach(() => {
    delete process.env.TRUSTED_IP_HEADER;
    delete process.env.GEO_COUNTRY_HEADER;
    resetEnvCache();
  });

  test('takes the first forwarded address', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' }))).toBe(
      '203.0.113.1',
    );
  });

  test('refuses things that are not addresses', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '<script>' }))).toBeNull();
  });

  test('unwraps IPv4-mapped IPv6', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '::ffff:203.0.113.9' }))).toBe('203.0.113.9');
  });

  test('a configured trusted header takes over', () => {
    process.env.TRUSTED_IP_HEADER = 'x-custom-ip';
    resetEnvCache();
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1', 'x-custom-ip': '2.2.2.2' });
    expect(getClientIp(headers)).toBe('2.2.2.2');
  });

  test('limits IPv6 by /64 and IPv4 by address', () => {
    expect(ipBucket('203.0.113.1')).toBe('203.0.113.1');
    expect(ipBucket('2001:db8:1:2:aaaa::1')).toBe('2001:0db8:0001:0002::/64');
    expect(ipBucket('2001:db8:1:2:bbbb::9')).toBe(ipBucket('2001:db8:1:2:aaaa::1'));
    expect(ipBucket('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
    expect(ipBucket('2001:db8:1:3::1')).not.toBe(ipBucket('2001:db8:1:2::1'));
  });

  test('reads a country code', () => {
    expect(getCountry(new Headers({ 'x-vercel-ip-country': 'dk' }))).toBe('DK');
  });

  test('ignores Cloudflare placeholder countries', () => {
    expect(getCountry(new Headers({ 'cf-ipcountry': 'XX' }))).toBeNull();
    expect(getCountry(new Headers({ 'cf-ipcountry': 'T1' }))).toBeNull();
  });
});

describe('environment', () => {
  afterEach(() => {
    delete process.env.ADMIN_PATH;
    delete process.env.BETTER_AUTH_SECRET;
    resetEnvCache();
  });

  test('the dashboard is off without ADMIN_PATH', () => {
    delete process.env.ADMIN_PATH;
    resetEnvCache();
    expect(adminBasePath()).toBeNull();
  });

  test('a valid ADMIN_PATH becomes a prefix', () => {
    process.env.ADMIN_PATH = '/my-panel/';
    resetEnvCache();
    expect(adminBasePath()).toBe('/my-panel');
  });

  test('an unsafe ADMIN_PATH disables the dashboard', () => {
    process.env.ADMIN_PATH = '../etc';
    resetEnvCache();
    expect(adminBasePath()).toBeNull();
  });

  test('a short secret is refused', () => {
    process.env.BETTER_AUTH_SECRET = 'short';
    resetEnvCache();
    expect(() => requireSecret('BETTER_AUTH_SECRET')).toThrow();
  });
});

describe('detectImageType', () => {
  const bytes = (values: number[]) => new Uint8Array([...values, ...new Array(20).fill(0)]);

  test('PNG', () =>
    expect(detectImageType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      'image/png',
    ));
  test('JPEG', () => expect(detectImageType(bytes([0xff, 0xd8, 0xff]))).toBe('image/jpeg'));
  test('SVG is refused', () => {
    expect(
      detectImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')),
    ).toBeNull();
  });
  test('HTML is refused', () => {
    expect(detectImageType(new TextEncoder().encode('<html><script>x</script></html>'))).toBeNull();
  });
});

describe('sanitizeFilename', () => {
  test('removes directories', () => expect(sanitizeFilename('../../etc/passwd')).toBe('passwd'));
  test('removes odd characters', () => expect(sanitizeFilename('a b<c>.png')).toBe('a-b-c-.png'));
});

describe('escapeHtml', () => {
  test('neutralizes markup', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;',
    );
  });

  test('layout embeds the accent', () => {
    expect(emailLayout('<tr></tr>', 'footer', '#123456')).toContain('#123456');
  });
});

describe('backoffSeconds', () => {
  test('doubles with each attempt', () => {
    expect([1, 2, 3, 4].map(backoffSeconds)).toEqual([30, 60, 120, 240]);
  });
});

describe('estimateReadingMinutes', () => {
  test('never below one', () => expect(estimateReadingMinutes('hi')).toBe(1));
  test('code blocks do not count', () => {
    const code = `\`\`\`\n${'word '.repeat(5000)}\n\`\`\``;
    expect(estimateReadingMinutes(code)).toBe(1);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  test('past', () => expect(formatRelativeTime('2026-06-15T10:00:00Z', now)).toBe('2h ago'));
  test('future', () => expect(formatRelativeTime('2026-06-17T12:00:00Z', now)).toBe('in 2d'));
  test('just now', () => expect(formatRelativeTime(now, now)).toBe('Just now'));
});

describe('shouldNotify', () => {
  const settings = SETTINGS_DEFAULTS.notifications;

  test('respects the minimum severity', () => {
    expect(shouldNotify(settings, 'geo', 'low')).toBe(false);
    expect(shouldNotify(settings, 'geo', 'medium')).toBe(true);
  });

  test('respects category switches', () => {
    const off = { ...settings, categories: { ...settings.categories, geo: false } };
    expect(shouldNotify(off, 'geo', 'high')).toBe(false);
  });

  test('critical incidents always pass', () => {
    const off = {
      ...settings,
      minSeverity: 'critical' as const,
      categories: { ...settings.categories, key_compromise: false },
    };
    expect(shouldNotify(off, 'key_compromise', 'critical')).toBe(true);
  });

  test('the master switch turns everything off', () => {
    expect(shouldNotify({ ...settings, enabled: false }, 'geo', 'critical')).toBe(false);
  });
});

const BRAND = { siteName: 'Example <Site>', ownerName: 'Owner', url: 'https://example.com' };

describe('securityAlertEmail', () => {
  const data = {
    title: 'Potential credential abuse',
    summary: 'Used from <b>8</b> addresses.',
    severity: 'critical' as const,
    classificationLabel: 'Suspected threat (unconfirmed)',
    occurredAt: new Date('2026-06-15T12:00:00Z'),
    keyPrefix: 'vnt_abc',
    endpoint: '/api/v1/posts',
    method: 'GET',
    ip: '203.0.113.1',
    country: 'DK',
    origin: 'https://evil.example"><script>alert(1)</script>',
    statusCode: 401,
    actionTaken: null,
    recommendedActions: ['Rotate the key.'],
    dashboardUrl: 'https://vante.app/x/security/1',
  };

  test('includes every required field', () => {
    const { html, text } = securityAlertEmail(data, BRAND);
    for (const value of [
      'CRITICAL',
      'vnt_abc',
      '/api/v1/posts',
      '203.0.113.1',
      'Rotate the key.',
    ]) {
      expect(html).toContain(value);
      expect(text).toContain(value);
    }
    expect(html).toContain('Denmark');
  });

  test('escapes attacker-controlled values', () => {
    const { html } = securityAlertEmail(data, BRAND);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>8</b>');
  });

  test('names the site from the database, escaped', () => {
    const { html } = securityAlertEmail(data, BRAND);
    expect(html).toContain('Example &lt;Site&gt;');
    expect(html).not.toContain('Example <Site>');
  });

  test('subject carries the severity', () => {
    expect(securityAlertEmail(data, BRAND).subject).toBe('[CRITICAL] Potential credential abuse');
  });
});

describe('createTrailingThrottle', () => {
  test('runs immediately, skips the burst, then runs once at the end', async () => {
    const throttle = createTrailingThrottle(40);
    let runs = 0;
    const task = async () => {
      runs += 1;
    };

    await throttle('a', task);
    expect(runs).toBe(1);

    const burst = Array.from({ length: 10 }, () => throttle('a', task));
    expect(runs).toBe(1);

    await Promise.all(burst);
    expect(runs).toBe(2);
  });

  test('keys are independent', async () => {
    const throttle = createTrailingThrottle(1000);
    let runs = 0;
    const task = async () => {
      runs += 1;
    };
    await Promise.all([throttle('a', task), throttle('b', task)]);
    expect(runs).toBe(2);
  });
});
