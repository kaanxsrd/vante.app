import { bigint, date, index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const deviceCategory = pgEnum('device_category', ['desktop', 'mobile', 'tablet', 'other']);

export const pageViews = pgTable(
  'page_views',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    path: text('path').notNull(),
    referrerHost: text('referrer_host'),
    source: text('source').notNull().default('direct'),
    country: text('country'),
    device: deviceCategory('device').notNull().default('other'),
    visitorHash: text('visitor_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('page_views_created_idx').on(t.createdAt.desc()),
    index('page_views_path_created_idx').on(t.path, t.createdAt.desc()),
    index('page_views_visitor_created_idx').on(t.visitorHash, t.createdAt.desc()),
  ],
);

export const analyticsSalts = pgTable('analytics_salts', {
  day: date('day', { mode: 'string' }).primaryKey(),
  salt: text('salt').notNull(),
});
