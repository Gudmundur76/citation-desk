/**
 * PayPal credentials smoke test.
 * Skipped when PAYPAL_CLIENT_ID is not set, empty, or set to the "DISABLED" sentinel.
 * Runs in CI only when real credentials are injected.
 */
import { describe, it, expect } from 'vitest'

const clientId = process.env.PAYPAL_CLIENT_ID ?? ''
const secret = process.env.PAYPAL_CLIENT_SECRET ?? ''
const SKIP =
  !clientId ||
  !secret ||
  clientId === 'DISABLED' ||
  secret === 'DISABLED' ||
  clientId.length < 10

describe('PayPal credentials', () => {
  it.skipIf(SKIP)('can obtain an access token from PayPal', async () => {
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
