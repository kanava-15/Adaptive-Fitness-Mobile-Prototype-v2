import { pgTable, text, primaryKey, foreignKey, index } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { catalogActivities } from './catalog-activities';

export const catalogAliases = pgTable('catalog_aliases', {
  release: text('release').notNull(),
  activityId: text('activity_id').notNull(),
  alias: text('alias').notNull(),
  normalized: text('normalized').notNull(),
}, t => [
  primaryKey({ columns: [t.release, t.activityId, t.alias] }),
  foreignKey({ columns: [t.release, t.activityId], foreignColumns: [catalogActivities.release, catalogActivities.id] }),
  index('catalog_alias_search_idx').on(t.release, t.normalized),
]);
export const insertCatalogAliasSchema = createInsertSchema(catalogAliases);
export type CatalogAliasRow = typeof catalogAliases.$inferSelect;
