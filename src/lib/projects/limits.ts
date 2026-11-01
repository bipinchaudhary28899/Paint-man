// Limits shared by the quotation's server checks (src/lib/projects/inputs.ts) and the editor's own
// (src/lib/admin/quotation-form.ts, in the website and the phone app). A plain module with no
// imports, so the app can share it without the website's validation library.

/** ₹1 crore in paise: a ceiling no single line comes near. */
export const MAX_LINE_PAISE = 1_00_00_000 * 100;
