import { pgTable, text, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { catalogActivities } from './catalog-activities';

export const catalogRelationships = pgTable('catalog_relationships', {
  release: text('release').notNull(),
  fromId: text('from_id').notNull(),
  toId: text('to_id').notNull(),
  type: text('type').notNull(),
}, t => [
  primaryKey({ columns: [t.release, t.fromId, t.toId, t.type] }),
  foreignKey({ columns: [t.release, t.fromId], foreignColumns: [catalogActivities.release, catalogActivities.id] }),
  foreignKey({ columns: [t.release, t.toId], foreignColumns: [catalogActivities.release, catalogActivities.id] }),
]);
export const insertCatalogRelationshipSchema = createInsertSchema(catalogRelationships);
export type CatalogRelationshipRow = typeof catalogRelationships.$inferSelect;
