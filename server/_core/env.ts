export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  // SMTP (Stalwart at mail.iventure.studio)
  smtpHost: process.env.SMTP_HOST ?? "mail.iventure.studio",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587"),
  smtpUser: process.env.SMTP_USER ?? "hello@iventure.studio",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "citation.is <hello@iventure.studio>",
  // PayPal checkout
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalSecret: process.env.PAYPAL_SECRET ?? "",
  paypalMode: (process.env.PAYPAL_MODE ?? "sandbox") as "sandbox" | "live",
};
