import "server-only";
import { maskPhone } from "./otp";

// How sign-in codes reach the customer.
//
// - msg91: when MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID are set. MSG91's Send SMS (flow) API:
//   POST https://control.msg91.com/api/v5/flow with the `authkey` header and
//   { template_id, short_url: "0", recipients: [{ mobiles: "91XXXXXXXXXX", otp: "123456" }] }.
//   The template is the DLT-approved OTP message, with its variable written ##otp## in MSG91.
//   MSG91 answers { type: "success", message: "<request id>" }, or type "error".
// - dev: outside production with no MSG91 keys, the code is printed to the server terminal with
//   a masked phone ("[dev OTP] ******3210 → 123456"). The only log line that holds a code.
// - none: in production with no keys; the send endpoint answers 503 otp_unavailable.

export const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow";

export type OtpProvider = { name: "msg91" | "dev"; send(phone: string, code: string): Promise<void> };

/** The SMS was not accepted. The message holds only the HTTP status: MSG91's body can echo the number. */
export class OtpSendError extends Error {
  constructor(public status: number) {
    super(`The SMS provider did not accept the code (status ${status}).`);
    this.name = "OtpSendError";
  }
}

function msg91(authKey: string, templateId: string): OtpProvider {
  return {
    name: "msg91",
    async send(phone, code) {
      const res = await fetch(MSG91_FLOW_URL, {
        method: "POST",
        headers: { authkey: authKey, accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ template_id: templateId, short_url: "0", recipients: [{ mobiles: `91${phone}`, otp: code }] }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await res.json().catch(() => null)) as { type?: string } | null;
      if (!res.ok || json?.type !== "success") throw new OtpSendError(res.status);
    },
  };
}

const dev: OtpProvider = {
  name: "dev",
  async send(phone, code) {
    console.info(`[dev OTP] ${maskPhone(phone)} → ${code}`);
  },
};

/** The provider for these settings, or null when codes cannot be sent (production without MSG91). */
export function getOtpProvider(env: Record<string, string | undefined> = process.env): OtpProvider | null {
  const authKey = env.MSG91_AUTH_KEY?.trim();
  const templateId = env.MSG91_OTP_TEMPLATE_ID?.trim();
  if (authKey && templateId) return msg91(authKey, templateId);
  return env.NODE_ENV === "production" ? null : dev;
}
