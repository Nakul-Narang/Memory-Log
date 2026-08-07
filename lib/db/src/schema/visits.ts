import { createInsertSchema } from 'drizzle-zod';
import { integer, pgTable, serial, text, timestamp, varchar, date } from 'drizzle-orm/pg-core';
import { z } from 'zod/v4';
import { usersTable } from './auth';

export const visitsTable = pgTable('visits', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: varchar('title').notNull(),
  location: varchar('location').notNull(),
  country: varchar('country').notNull(),
  visitDate: date('visit_date', { mode: 'string' }).notNull(),
  description: text('description').notNull().default(''),
  highlights: text('highlights').array().notNull().default([]),
  travelCompanions: text('travel_companions').array().notNull().default([]),
  googlePhotosUrl: varchar('google_photos_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const photosTable = pgTable('photos', {
  id: serial('id').primaryKey(),
  visitId: integer('visit_id').notNull().references(() => visitsTable.id, { onDelete: 'cascade' }),
  objectPath: varchar('object_path').notNull(),
  caption: varchar('caption').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const insertVisitSchema = createInsertSchema(visitsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhotoSchema = createInsertSchema(photosTable).omit({
  id: true,
  createdAt: true,
});

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;
export type Photo = typeof photosTable.$inferSelect;