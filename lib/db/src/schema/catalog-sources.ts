import { pgTable, text, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { catalogReleases } from './catalog-releases';

export const catalogSources = pgTable('catalog_sources', {
  release: text('release').notNull().references(() => catalogReleases.version),
  id: text('id').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  record: jsonb('record').notNull(),
}, t => [primaryKey({ columns: [t.release, t.id] })]);
export const insertCatalogSourceSchema = createInsertSchema(catalogSources);
export type CatalogSourceRow = typeof catalogSources.$inferSelect;
