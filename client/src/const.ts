export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Open the magic-link sign-in dialog.
 * Dispatches a custom event that MagicLinkDialog listens for.
 */
export const openSignInDialog = () => {
  window.dispatchEvent(new CustomEvent("td:open-sign-in"));
};

/**
 * @deprecated Use openSignInDialog() instead.
 * Manus OAuth (api.manus.im) is unreachable from Cloud Run.
 */
export const getLoginUrl = () => {
  openSignInDialog();
  return "#";
};
