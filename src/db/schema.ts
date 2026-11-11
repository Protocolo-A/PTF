import { boolean, doublePrecision, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { ResumeData } from "../lib/resume";

export const resumes = pgTable("resumes", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<ResumeData>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorToken: text("visitor_token").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").default("open").notNull(),
  unreadForAdmin: boolean("unread_for_admin").default(true).notNull(),
  unreadForVisitor: boolean("unread_for_visitor").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
  deviceLabel: text("device_label").default("Dispositivo no identificado").notNull(),
  browserName: text("browser_name").default("Navegador no identificado").notNull(),
  platformName: text("platform_name").default("Sistema no identificado").notNull(),
  deviceType: text("device_type").default("Dispositivo no identificado").notNull(),
  deviceModel: text("device_model"),
  locationLabel: text("location_label").default("Ubicación no disponible").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
}, (table) => ({
  visitorTokenUnique: uniqueIndex("chat_conversations_visitor_token_unique").on(table.visitorToken),
  lastMessageIndex: index("chat_conversations_last_message_idx").on(table.lastMessageAt),
}));

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  conversationIndex: index("chat_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
}));


export const siteVisits = pgTable("site_visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorToken: text("visitor_token").notNull(),
  deviceLabel: text("device_label").notNull(),
  browserName: text("browser_name").notNull(),
  platformName: text("platform_name").notNull(),
  deviceType: text("device_type").notNull().default("Dispositivo no identificado"),
  deviceModel: text("device_model"),
  locationLabel: text("location_label").notNull().default("Ubicación no disponible"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  path: text("path").notNull().default("/"),
  visitedAt: timestamp("visited_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  visitorTokenUnique: uniqueIndex("site_visits_visitor_token_unique").on(table.visitorToken),
  visitedAtIndex: index("site_visits_visited_at_idx").on(table.visitedAt),
}));


export const newsArticles = pgTable("news_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  coverImage: text("cover_image").notNull().default(""),
  blocks: jsonb("blocks").$type<import("../lib/news").NewsBlock[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => ({
  slugUnique: uniqueIndex("news_articles_slug_unique").on(table.slug),
  statusPublishedIndex: index("news_articles_status_published_idx").on(table.status, table.publishedAt),
}));
