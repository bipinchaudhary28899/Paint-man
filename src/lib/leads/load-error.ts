import { SheetsRequestError, StorageNotConfiguredError } from "./store";

/**
 * Turns a lead-loading failure into a fix-it message for the signed-in admin.
 * Messages name settings, never their values.
 */
export function leadLoadErrorMessage(err: unknown): string {
  if (err instanceof StorageNotConfiguredError) {
    return "Google Sheets isn't connected yet. Add GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to the environment settings (on Vercel: Settings → Environment Variables), then redeploy.";
  }
  if (err instanceof SheetsRequestError) {
    if (err.status === 403) {
      return "Google Sheets refused access. Share the sheet with the service account's email address as an Editor, and make sure the Google Sheets API is enabled for that project.";
    }
    if (err.status === 404) return "Google Sheets couldn't find that spreadsheet. Check GOOGLE_SHEETS_ID (the long ID in the sheet's URL).";
    if (err.status === 400) {
      return 'Google Sheets couldn\'t find the tab. Create a tab named "Leads" in the sheet, or set GOOGLE_SHEETS_TAB to your tab\'s name.';
    }
    if (err.status === 429) return "Google Sheets is rate-limiting requests. Wait a minute and refresh.";
    return `Google Sheets returned an error (status ${err.status}). Try again in a moment.`;
  }
  const text = err instanceof Error ? err.message : "";
  if (/invalid_grant|private key|DECODER|PEM|invalid_client|unauthorized_client/i.test(text)) {
    return "Google rejected the service account key. Re-copy GOOGLE_PRIVATE_KEY from the JSON key file (keep the \\n line breaks) and check GOOGLE_SERVICE_ACCOUNT_EMAIL.";
  }
  return "Couldn't load leads. Check the server logs and the Google Sheets settings, then try again.";
}
