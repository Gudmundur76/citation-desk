/**
 * Magic-link authentication routes.
 *
 * POST /api/auth/magic-link/request
 *   - Accepts { email }
 *   - Rate-limits to 5 tokens per email per 10 minutes
 *   - Generates a cryptographically random token, stores its SHA-256 hash
 *   - Sends the sign-in link via the Manus notification system (owner-only for now)
 *     OR logs it in development for easy testing
 *   - Returns { ok: true } regardless of whether the email exists (no enumeration)
 *
 * GET /api/auth/magic-link/verify?token=<raw>
 *   - Looks up the SHA-256 hash of the token
 *   - Validates: not used, not expired
 *   - Marks token as used (single-use)
 *   - Upserts the user row (email_ prefix openId so it never calls api.manus.im)
 *   - Creates a local JWT session cookie
 *   - Redirects to /
 */

import crypto from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Build a stable openId for email-only users — never calls api.manus.im */
function emailOpenId(email: string): string {
  return `email_${crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32)}`;
}

async function sendMagicLinkEmail(email: string, verifyUrl: string): Promise<void> {
  if (ENV.isProduction) {
    // In production, use the Manus notification system to email the owner.
    // For non-owner users, log the link — a proper transactional email
    // integration (SendGrid / Resend) can be wired here later.
    try {
      const res = await fetch(`${ENV.forgeApiUrl}/v1/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
          title: `Magic link sign-in request`,
          content: `Email: ${email}\nLink: ${verifyUrl}\n\nExpires in 15 minutes.`,
        }),
      });
      if (!res.ok) {
        console.warn("[MagicLink] Notification send failed:", res.status);
      }
    } catch (err) {
      console.error("[MagicLink] Failed to send notification:", err);
    }
  } else {
    // Development: print the link to server stdout for easy testing
    console.log(`\n[MagicLink] Sign-in link for ${email}:\n${verifyUrl}\n`);
  }
}

export function registerMagicLinkRoutes(app: Express) {
  // POST /api/auth/magic-link/request
  app.post("/api/auth/magic-link/request", async (req: Request, res: Response) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }

    try {
      // Rate limit: max 5 tokens per email per 10 minutes
      const recent = await db.countRecentMagicLinkRequests(email, RATE_LIMIT_WINDOW_MS);
      if (recent >= RATE_LIMIT_MAX) {
        // Return 200 to avoid enumeration — client shows the same "check your email" UI
        res.json({ ok: true });
        return;
      }

      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      await db.createMagicLinkToken({ email, tokenHash, expiresAt });

      const origin = req.headers.origin ?? `${req.protocol}://${req.headers.host}`;
      const verifyUrl = `${origin}/api/auth/magic-link/verify?token=${rawToken}`;

      await sendMagicLinkEmail(email, verifyUrl);

      res.json({ ok: true });
    } catch (err) {
      console.error("[MagicLink] Request failed:", err);
      res.status(500).json({ error: "Failed to send magic link" });
    }
  });

  // GET /api/auth/magic-link/verify?token=<raw>
  app.get("/api/auth/magic-link/verify", async (req: Request, res: Response) => {
    const rawToken = typeof req.query.token === "string" ? req.query.token : null;

    if (!rawToken) {
      res.status(400).send("Missing token");
      return;
    }

    try {
      const tokenHash = hashToken(rawToken);
      const record = await db.findValidMagicLinkToken(tokenHash);

      if (!record) {
        res.status(400).send("Invalid or expired sign-in link. Please request a new one.");
        return;
      }

      // Mark as used (single-use)
      await db.markMagicLinkTokenUsed(record.id);

      const email = record.email;
      const openId = emailOpenId(email);

      // Upsert user — email_ prefix ensures we never call api.manus.im
      await db.upsertUser({
        openId,
        email,
        name: email.split("@")[0],
        loginMethod: "magic_link",
        lastSignedIn: new Date(),
      });

      // Create a local JWT session cookie (same mechanism as OAuth callback)
      const sessionToken = await sdk.createSessionToken(openId, {
        name: email.split("@")[0],
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (err) {
      console.error("[MagicLink] Verify failed:", err);
      res.status(500).send("Sign-in failed. Please try again.");
    }
  });
}
