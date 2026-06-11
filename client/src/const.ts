export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * @deprecated api.manus.im is unreachable from Cloud Run (no VPC egress).
 * Use openSignInDialog() instead, which dispatches a 'td:open-sign-in' event
 * that opens the MagicLinkDialog mounted globally in App.tsx.
 *
 * Kept as a shim so existing call sites don't break before migration.
 */
export const getLoginUrl = () => {
  // Return "#" — the caller should use openSignInDialog() instead
  return "#";
};

/**
 * Open the global magic-link sign-in dialog.
 * Dispatches a 'td:open-sign-in' CustomEvent which App.tsx listens for.
 */
export function openSignInDialog() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("td:open-sign-in"));
  }
}
