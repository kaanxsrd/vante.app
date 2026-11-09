import { describe, expect, test } from 'bun:test';
import { createApiKeySchema } from '@/features/api-keys/schema';
import { postInputSchema } from '@/features/blog/schema';
import { projectInputSchema } from '@/features/projects/schema';
import { notificationSettingsSchema, SETTINGS_DEFAULTS } from '@/features/settings/schema';

const post = { title: 'Title', slug: 'a-slug', content: '' };
const key = {
  name: 'Key',
  scopes: ['posts:read'],
  rateLimitPerMinute: 60,
  dailyQuota: null,
  expiresAt: null,
};

describe('postInputSchema', () => {
  test('applies defaults', () => {
    const parsed = postInputSchema.parse(post);
    expect(parsed.status).toBe('draft');
    expect(parsed.tags).toEqual([]);
  });

  test('turns empty optional fields into null', () => {
    expect(postInputSchema.parse({ ...post, seoTitle: '', thumbnail: '  ' }).seoTitle).toBeNull();
  });

  test('removes duplicate tags', () => {
    expect(postInputSchema.parse({ ...post, tags: ['a', 'a', 'b'] }).tags).toEqual(['a', 'b']);
  });

  test.each(['Has Spaces', 'UPPER', '-leading', 'trailing-', 'dou--ble', ''])(
    'rejects the slug %p',
    (slug) => {
      expect(postInputSchema.safeParse({ ...post, slug }).success).toBe(false);
    },
  );

  test.each(['javascript:alert(1)', '//evil.example/x.png', 'data:text/html,x'])(
    'rejects the image URL %p',
    (thumbnail) => {
      expect(postInputSchema.safeParse({ ...post, thumbnail }).success).toBe(false);
    },
  );

  test('accepts a media path', () => {
    expect(postInputSchema.safeParse({ ...post, thumbnail: '/media/abc' }).success).toBe(true);
  });
});

describe('projectInputSchema', () => {
  const project = { title: 'P', slug: 'p', content: '', category: 'Web' };

  test('requires a category', () => {
    expect(projectInputSchema.safeParse({ ...project, category: '' }).success).toBe(false);
  });

  test('rejects a non-http repository URL', () => {
    expect(
      projectInputSchema.safeParse({ ...project, githubUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
  });

  test('rejects a dangerous custom link', () => {
    const links = [{ name: 'x', href: 'javascript:alert(1)' }];
    expect(projectInputSchema.safeParse({ ...project, links }).success).toBe(false);
  });
});

describe('createApiKeySchema', () => {
  test('accepts a valid key', () => {
    expect(createApiKeySchema.safeParse(key).success).toBe(true);
  });

  test('requires a permission', () => {
    expect(createApiKeySchema.safeParse({ ...key, scopes: [] }).success).toBe(false);
  });

  test('rejects unknown permissions', () => {
    expect(createApiKeySchema.safeParse({ ...key, scopes: ['admin:all'] }).success).toBe(false);
  });

  test('rejects an expiry in the past', () => {
    expect(createApiKeySchema.safeParse({ ...key, expiresAt: '2000-01-01' }).success).toBe(false);
  });

  test('rejects a bad origin', () => {
    expect(
      createApiKeySchema.safeParse({ ...key, allowedOrigins: ['https://a.com/path'] }).success,
    ).toBe(false);
  });

  test('rejects a bad IP address', () => {
    expect(createApiKeySchema.safeParse({ ...key, allowedIps: ['999.1.1.1'] }).success).toBe(false);
  });

  test('normalizes country codes', () => {
    const parsed = createApiKeySchema.parse({ ...key, expectedCountries: ['dk'] });
    expect(parsed.expectedCountries).toEqual(['DK']);
  });
});

describe('notificationSettingsSchema', () => {
  test('accepts the defaults', () => {
    expect(notificationSettingsSchema.safeParse(SETTINGS_DEFAULTS.notifications).success).toBe(
      true,
    );
  });

  test('an empty recipient means none', () => {
    const parsed = notificationSettingsSchema.parse({
      ...SETTINGS_DEFAULTS.notifications,
      recipient: '',
    });
    expect(parsed.recipient).toBeNull();
  });

  test('rejects a malformed recipient', () => {
    expect(
      notificationSettingsSchema.safeParse({
        ...SETTINGS_DEFAULTS.notifications,
        recipient: 'nope',
      }).success,
    ).toBe(false);
  });
});
