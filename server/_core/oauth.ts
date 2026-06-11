/**
 * OAuth routes — stub only.
 *
 * Manus OAuth (api.manus.im) has been removed. Authentication is handled
 * exclusively via magic-link email auth at /api/auth/magic-link/*.
 * This file is kept as a no-op to avoid breaking any imports.
 */
import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  // No-op: Manus OAuth callback removed.
  // Magic-link routes are registered in server/magicLink.ts.
}
