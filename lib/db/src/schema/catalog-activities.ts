import { pgTable, text, integer, jsonb, primaryKey, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { sql } from 'drizzle-orm';
import { catalogReleases } from './catalog-releases';

export const catalogActivities = pgTable('catalog_activities', {
  release: text('release').notNull().references(() => catalogReleases.version),
  id: text('id').notNull(),
  version: integer('version').notNull(),
  name: text('name').notNull(),
  discipline: text('discipline').notNull(),
  type: text('type').notNull(),
  retrievalText: text('retrieval_text').notNull(),
  definition: jsonb('definition').notNull(),
}, t => [
  primaryKey({ columns: [t.release, t.id] }),
  index('catalog_name_idx').on(t.release, t.name),
  index('catalog_discipline_idx').on(t.release, t.discipline, t.type),
  index('catalog_retrieval_text_idx').using('gin', sql`to_tsvector('simple', ${t.retrievalText})`),
]);
export const insertCatalogActivitySchema = createInsertSchema(catalogActivities);
export type CatalogActivityRow = typeof catalogActivities.$inferSelect;
