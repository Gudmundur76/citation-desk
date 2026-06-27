import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Per-user in-app notification inbox.
 * Notifications are created by server-side events (audit submitted, claim verified, etc.)
 * and displayed in the notification bell / inbox drawer.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull().default("info"),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 512 }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Web Push subscriptions for browser push notifications.
 * Stored per-user so the server can push to all of a user's devices.
 */
export const pushSubscriptions = mysqlTable("pushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: varchar("auth", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Tracks project-level heartbeat cron jobs so their taskUid can be
 * looked up for updates, pauses, and dedup in the callback handler.
 */
export const scheduledJobs = mysqlTable("scheduledJobs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  taskUid: varchar("taskUid", { length: 65 }).notNull(),
  description: text("description"),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;

/**
 * Magic-link authentication tokens.
 * tokenHash: SHA-256 of the raw token (never store raw token).
 * usedAt: set on first use — subsequent uses are rejected.
 * Rate limit: max 5 tokens per email per 10 minutes.
 */
export const magicLinkTokens = mysqlTable("magic_link_tokens", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;

/**
 * Commercial subscription records.
 * Created when a PayPal order is created (status=pending),
 * updated to active when the order is captured.
 */
export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  // Email used at checkout (no auth required for citation.is)
  email: varchar("email", { length: 320 }).notNull(),
  paypalOrderId: varchar("paypalOrderId", { length: 128 }).notNull().unique(),
  paypalCaptureId: varchar("paypalCaptureId", { length: 128 }),
  planTier: mysqlEnum("planTier", ["starter", "diligence", "platform"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "cancelled", "refunded"]).notNull().default("pending"),
  auditsLimit: int("auditsLimit").notNull(),
  auditsUsed: int("auditsUsed").notNull().default(0),
  amountUsd: int("amountUsd").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  activatedAt: timestamp("activatedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * API keys for programmatic access to citation.is.
 * Only the SHA-256 hash is stored — the raw key is shown once at creation.
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  // Linked to user_subscriptions.email (no auth table in citation-desk)
  email: varchar("email", { length: 320 }).notNull(),
  keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 128 }).notNull(),
  scopes: text("scopes").notNull().default("[\"read\"]"), // JSON array stored as text
  keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Tracks autonomous ingestion sources — OpenAlex, Perplexity Search, PubMed, etc.
 * Each row represents one source with live stats updated by the ingestion scheduled job.
 */
export const ingestionSources = mysqlTable("ingestion_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["academic", "legal", "financial", "news", "web", "regulatory"]).notNull().default("academic"),
  isActive: boolean("isActive").notNull().default(true),
  documentsIngested: int("documentsIngested").notNull().default(0),
  claimsExtracted: int("claimsExtracted").notNull().default(0),
  queriesRun: int("queriesRun").notNull().default(0),
  lastRunAt: timestamp("lastRunAt"),
  lastError: text("lastError"),
  config: text("config"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IngestionSource = typeof ingestionSources.$inferSelect;
export type InsertIngestionSource = typeof ingestionSources.$inferInsert;

/**
 * Stores individual verification results from the /verify comparison tool.
 * Each row is one claim checked through the verdict engine, with a shareable URL.
 */
export const verificationResults = mysqlTable("verification_results", {
  id: int("id").autoincrement().primaryKey(),
  shareId: varchar("shareId", { length: 32 }).notNull().unique(),
  claimText: text("claimText").notNull(),
  verdict: mysqlEnum("verdict", ["supported", "refuted", "ambiguous", "insufficient_evidence", "error"]).notNull(),
  confidenceScore: int("confidenceScore").notNull().default(0),
  evidenceSummary: text("evidenceSummary"),
  sourceUrls: text("sourceUrls"),
  rawResponse: text("rawResponse"),
  ipHash: varchar("ipHash", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VerificationResult = typeof verificationResults.$inferSelect;
export type InsertVerificationResult = typeof verificationResults.$inferInsert;

/**
 * Stores comparison results from the /compare Perplexity accuracy tool.
 * Each row is one query + AI answer + claim verdicts, with a shareable URL.
 */
export const comparisons = mysqlTable("comparisons", {
  id: int("id").autoincrement().primaryKey(),
  shareId: varchar("shareId", { length: 32 }).notNull().unique(),
  query: text("query").notNull(),
  aiAnswer: text("aiAnswer").notNull(),
  aiSource: varchar("aiSource", { length: 64 }).notNull().default("perplexity-sonar"),
  claimsJson: text("claimsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Comparison = typeof comparisons.$inferSelect;
export type InsertComparison = typeof comparisons.$inferInsert;
