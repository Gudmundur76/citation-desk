/**
 * Magic-link authentication routes.
 *
 * POST /api/auth/magic-link/request  — send a sign-in link to the user's email
 * GET  /api/auth/magic-link/verify   — verify the token and create a session
 *
 * No api.manus.im calls are made. All auth is local.
 */
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { sendEmail } from "./_core/mailer";

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendMagicLinkEmail(email: string, magicLink: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Your citation.is sign-in link",
    text: `Click the link below to sign in to citation.is. It expires in 15 minutes.\n\n${magicLink}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>Click the link below to sign in to <strong>citation.is</strong>. It expires in 15 minutes.</p><p><a href="${magicLink}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Sign in to citation.is</a></p><p style="color:#666;font-size:12px;">If you did not request this, you can safely ignore this email.</p>`,
  });
}

export function registerMagicLinkRoutes(app: Express) {
  app.post("/api/auth/magic-link/request", async (req: Request, res: Response) => {
    const { email, origin } = req.body as { email?: string; origin?: string };

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }

    const baseUrl = origin || `${req.protocol}://${req.get("host")}`;

    try {
      const recentCount = await db.countRecentMagicLinks(email, RATE_LIMIT_WINDOW_MS);
      if (recentCount >= RATE_LIMIT_MAX) {
        res.status(429).json({ error: "Too many requests. Please wait 10 minutes." });
        return;
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

      await db.createMagicLinkToken({ email, tokenHash, expiresAt });

      const magicLink = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;
      await sendMagicLinkEmail(email, magicLink);

      res.json({ success: true, message: "Sign-in link sent. Check your email." });
    } catch (error) {
      console.error("[MagicLink] Request failed:", error);
      res.status(500).json({ error: "Failed to send sign-in link" });
    }
  });

  app.get("/api/auth/magic-link/verify", async (req: Request, res: Response) => {
    const { token } = req.query as { token?: string };

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    try {
      const tokenHash = hashToken(token);
      const record = await db.findValidMagicLinkToken(tokenHash);

      if (!record) {
        res.status(400).json({ error: "Invalid or expired sign-in link" });
        return;
      }

      await db.markMagicLinkUsed(record.id);

      const openId = `email_${record.email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      await db.upsertUser({
        openId,
        email: record.email,
        name: record.email.split("@")[0],
        loginMethod: "magic_link",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: record.email.split("@")[0],
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[MagicLink] Verify failed:", error);
      res.status(500).json({ error: "Sign-in verification failed" });
    }
  });
}
