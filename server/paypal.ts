/**
 * PayPal REST API v2 client — server-side only.
 * Handles order creation and capture for the citation.is commercial plans.
 *
 * Uses the PayPal Orders API v2:
 *   POST /v2/checkout/orders           → create order
 *   POST /v2/checkout/orders/:id/capture → capture approved order
 *
 * Credentials come from ENV.paypalClientId / ENV.paypalSecret / ENV.paypalMode.
 */

import { ENV } from "./_core/env";

const PAYPAL_BASE =
  ENV.paypalMode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrderLink {
  href: string;
  rel: string;
  method: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalOrderLink[];
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  }>;
}

// Simple in-memory token cache (expires in ~8.5 min, PayPal gives 9 min)
let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiresAt) {
    return _cachedToken;
  }

  const credentials = Buffer.from(
    `${ENV.paypalClientId}:${ENV.paypalSecret}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as PayPalTokenResponse;
  _cachedToken = data.access_token;
  // Expire 30 seconds early to avoid edge cases
  _tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
  return _cachedToken;
}

export interface CreateOrderParams {
  planTier: "starter" | "diligence" | "platform";
  amountUsd: number;
  returnUrl: string;
  cancelUrl: string;
  description: string;
}

/**
 * Create a PayPal order and return the order ID + approval URL.
 */
export async function createPayPalOrder(
  params: CreateOrderParams
): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getAccessToken();

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: params.amountUsd.toFixed(2),
        },
        description: params.description,
        custom_id: params.planTier,
      },
    ],
    application_context: {
      brand_name: "citation.is",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    },
  };

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `citation-${params.planTier}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal createOrder error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as PayPalOrderResponse;
  const approvalLink = data.links.find((l) => l.rel === "approve");
  if (!approvalLink) {
    throw new Error("PayPal order created but no approval URL returned");
  }

  return { orderId: data.id, approvalUrl: approvalLink.href };
}

/**
 * Capture an approved PayPal order and return the capture ID.
 */
export async function capturePayPalOrder(
  orderId: string
): Promise<{ captureId: string; status: string; amountUsd: number }> {
  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture-${orderId}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal captureOrder error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as PayPalCaptureResponse;
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) {
    throw new Error("PayPal capture succeeded but no capture record returned");
  }

  return {
    captureId: capture.id,
    status: data.status,
    amountUsd: parseFloat(capture.amount.value),
  };
}
