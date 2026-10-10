import { pgTable, text, integer, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const catalogReleases = pgTable('catalog_releases', {
  version: text('version').primaryKey(),
  schemaVersion: integer('schema_version').notNull(),
  checksum: text('checksum').notNull(),
  reviewStatus: text('review_status').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  active: boolean('active').notNull().default(false),
}, t => [uniqueIndex('catalog_one_active_release').on(t.active).where(sql`${t.active} = true`)]);
export const insertCatalogReleaseSchema = createInsertSchema(catalogReleases);
export type CatalogReleaseRow = typeof catalogReleases.$inferSelect;
