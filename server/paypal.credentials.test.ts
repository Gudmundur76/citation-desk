/**
 * PayPal credentials smoke test.
 * Skipped when PAYPAL_CLIENT_ID is not set (local dev without credentials).
 * Runs in CI only when the secret is injected.
 */
import { describe, it, expect } from 'vitest'

const SKIP = !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET

describe('PayPal credentials', () => {
  it.skipIf(SKIP)('can obtain an access token from PayPal', async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID!
    const secret = process.env.PAYPAL_CLIENT_SECRET!
    const mode = process.env.PAYPAL_MODE ?? 'live'
    const base =
      mode === 'sandbox'
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com'

    const creds = Buffer.from(`${clientId}:${secret}`).toString('base64')
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    const json = (await res.json()) as { access_token?: string; error?: string }

    expect(
      json.access_token,
      `PayPal auth failed: ${JSON.stringify(json)}`,
    ).toBeTruthy()
  })
})
