import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const connectUsers = pgTable("connect_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Log entries table
export const logEntries = pgTable("log_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => connectUsers.id),
  name: text("name"),
  company: text("company"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  where_met: text("where_met"),
  notes: text("notes"),
  is_favorite: boolean("is_favorite").default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Tags table
export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => connectUsers.id),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Junction table for log entries and tags (many-to-many)
export const logEntriesTags = pgTable("log_entries_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  log_entry_id: uuid("log_entry_id").notNull().references(() => logEntries.id),
  tag_id: uuid("tag_id").notNull().references(() => tags.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Media table for log entries
export const media = pgTable("media", {
  id: uuid("id").defaultRandom().primaryKey(),
  log_entry_id: uuid("log_entry_id").notNull().references(() => logEntries.id),
  url: text("url").notNull(),
  type: text("type").notNull(), // 'image' or 'video'
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// User message templates
export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().references(() => connectUsers.id),
  email_template: text("email_template"),
  sms_template: text("sms_template"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for insertions
export const insertUserSchema = createInsertSchema(connectUsers).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertLogEntrySchema = createInsertSchema(logEntries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertLogEntryTagSchema = createInsertSchema(logEntriesTags).omit({
  id: true,
  created_at: true,
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Export types
export type User = typeof connectUsers.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type LogEntry = typeof logEntries.$inferSelect;
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type LogEntryTag = typeof logEntriesTags.$inferSelect;
export type InsertLogEntryTag = z.infer<typeof insertLogEntryTagSchema>;

export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

// Extended types with relationships
export type LogEntryWithRelations = LogEntry & {
  tags?: Tag[];
  media?: Media[];
};

export type ContactPerson = {
  id: string;
  name?: string | null;
  company?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  logEntries: LogEntry[];
  tags?: Tag[];
};
