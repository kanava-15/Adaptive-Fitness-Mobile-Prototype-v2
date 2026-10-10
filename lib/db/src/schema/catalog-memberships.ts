import { pgTable, text, integer, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { catalogActivities } from './catalog-activities';

export const catalogMemberships = pgTable('catalog_memberships', {
  release: text('release').notNull(),
  sequenceId: text('sequence_id').notNull(),
  activityId: text('activity_id').notNull(),
  order: integer('position').notNull(),
  side: text('side').notNull(),
}, t => [
  primaryKey({ columns: [t.release, t.sequenceId, t.order] }),
  foreignKey({ columns: [t.release, t.sequenceId], foreignColumns: [catalogActivities.release, catalogActivities.id] }),
  foreignKey({ columns: [t.release, t.activityId], foreignColumns: [catalogActivities.release, catalogActivities.id] }),
]);
export const insertCatalogMembershipSchema = createInsertSchema(catalogMemberships);
export type CatalogMembershipRow = typeof catalogMemberships.$inferSelect;
