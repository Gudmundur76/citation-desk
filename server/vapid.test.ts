import { describe, expect, it } from "vitest";

describe("VAPID keys", () => {
  it("VAPID_PUBLIC_KEY is set and is a valid Base64url string of correct length", () => {
    const key = process.env.VAPID_PUBLIC_KEY ?? "";
    expect(key.length).toBeGreaterThan(80);
    // Base64url characters only
    expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("VAPID_PRIVATE_KEY is set and is a valid Base64url string of correct length", () => {
    const key = process.env.VAPID_PRIVATE_KEY ?? "";
    expect(key.length).toBeGreaterThan(40);
    expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("VITE_VAPID_PUBLIC_KEY matches VAPID_PUBLIC_KEY", () => {
    expect(process.env.VITE_VAPID_PUBLIC_KEY).toBe(process.env.VAPID_PUBLIC_KEY);
  });
});
