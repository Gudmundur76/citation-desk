/**
 * Magic-link authentication route tests.
 *
 * These tests verify the request and verify endpoints using a mock DB layer
 * so they run without a real database connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerMagicLinkRoutes } from "./magicLink";

// ─── Mock the DB helpers ──────────────────────────────────────────────────────
vi.mock("./db", () => ({
  countRecentMagicLinkRequests: vi.fn().mockResolvedValue(0),
  createMagicLinkToken: vi.fn().mockResolvedValue(undefined),
  findValidMagicLinkToken: vi.fn().mockResolvedValue(undefined),
  markMagicLinkTokenUsed: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock the SDK so we don't call api.manus.im ───────────────────────────────
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

// ─── Mock the notification fetch so we don't hit the Forge API ───────────────
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

import * as dbModule from "./db";
import { sdk } from "./_core/sdk";

function buildApp() {
  const app = express();
  app.use(express.json());
  registerMagicLinkRoutes(app);
  return app;
}

describe("POST /api/auth/magic-link/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbModule.countRecentMagicLinkRequests).mockResolvedValue(0);
    vi.mocked(dbModule.createMagicLinkToken).mockResolvedValue(undefined);
  });

  it("returns { ok: true } for a valid email", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/magic-link/request")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(dbModule.createMagicLinkToken).toHaveBeenCalledOnce();
  });

  it("returns 400 for missing email", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/magic-link/request")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("returns 400 for invalid email format", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/magic-link/request")
      .send({ email: "notanemail" });

    expect(res.status).toBe(400);
  });

  it("returns { ok: true } silently when rate limit is hit (no enumeration)", async () => {
    vi.mocked(dbModule.countRecentMagicLinkRequests).mockResolvedValue(5);
    const app = buildApp();
    const res = await request(app)
      .post("/api/auth/magic-link/request")
      .send({ email: "spammer@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    // Should NOT create a new token when rate-limited
    expect(dbModule.createMagicLinkToken).not.toHaveBeenCalled();
  });

  it("normalises email to lowercase", async () => {
    const app = buildApp();
    await request(app)
      .post("/api/auth/magic-link/request")
      .send({ email: "UPPER@EXAMPLE.COM" });

    const call = vi.mocked(dbModule.createMagicLinkToken).mock.calls[0]?.[0];
    expect(call?.email).toBe("upper@example.com");
  });
});

describe("GET /api/auth/magic-link/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when token is missing", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/auth/magic-link/verify");
    expect(res.status).toBe(400);
  });

  it("returns 400 when token is invalid or expired", async () => {
    vi.mocked(dbModule.findValidMagicLinkToken).mockResolvedValue(undefined);
    const app = buildApp();
    const res = await request(app).get("/api/auth/magic-link/verify?token=badtoken");
    expect(res.status).toBe(400);
  });

  it("redirects to / and sets session cookie on valid token", async () => {
    vi.mocked(dbModule.findValidMagicLinkToken).mockResolvedValue({
      id: 1,
      email: "user@example.com",
      tokenHash: "abc123",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(sdk.createSessionToken).mockResolvedValue("valid-session-token");

    const app = buildApp();
    const res = await request(app).get("/api/auth/magic-link/verify?token=validtoken");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(dbModule.markMagicLinkTokenUsed).toHaveBeenCalledWith(1);
    expect(dbModule.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com", loginMethod: "magic_link" })
    );
  });
});
