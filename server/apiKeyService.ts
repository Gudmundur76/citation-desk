/**
 * API key service for citation.is.
 * Adapted from ttruthdesk-platform apiKeyService.ts.
 *
 * Security model:
 *   - Raw key is 32 random bytes (hex-encoded, 64 chars)
 *   - Only SHA-256 hash is stored in DB
 *   - Raw key returned ONCE at creation — never again
 *   - First 8 chars stored as keyPrefix for display
 *
 * Keys are linked to an email address (no user auth in citation-desk).
 * The email must match an active subscription in user_subscriptions.
 */

import { createHash, randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { apiKeys, type ApiKey } from "../drizzle/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GenerateApiKeyResult {
  id: number;
  rawKey: string;       // shown ONCE — user must copy it
  keyPrefix: string;    // first 8 chars, safe to show later
  label: string;
  createdAt: Date;
}

export interface ApiKeyRecord {
  id: number;
  email: string;
  label: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

function generateRawKey(): string {
  return randomBytes(32).toString("hex");
}

// ── Generate a new API key ─────────────────────────────────────────────────────

export async function generateApiKey(opts: {
  email: string;
  label: string;
}): Promise<GenerateApiKeyResult | null> {
  const db = await getDb();
  if (!db) return null;

  const { email, label } = opts;
  if (!label.trim()) throw new Error("Label must not be empty");

  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);

  const result = await db.insert(apiKeys).values({
    email,
    keyHash,
    label: label.trim(),
    scopes: '["read"]',
    keyPrefix,
  });

  const insertId = (result as unknown as { insertId: number }).insertId ?? 0;

  return {
    id: insertId,
    rawKey,
    keyPrefix,
    label: label.trim(),
    createdAt: new Date(),
  };
}

// ── List API keys for an email ─────────────────────────────────────────────────

export async function listApiKeys(email: string): Promise<ApiKeyRecord[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.email, email), isNull(apiKeys.revokedAt)));

  return rows.map((row: ApiKey) => ({
    id: row.id,
    email: row.email,
    label: row.label,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }));
}

// ── Revoke an API key ─────────────────────────────────────────────────────────

export async function revokeApiKey(keyId: number, email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.email, email)));

  return true;
}
