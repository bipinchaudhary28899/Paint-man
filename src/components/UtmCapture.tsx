"use client";

import { useEffect } from "react";

export const TRACKING_KEY = "pm_first_touch";

export type Tracking = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  referrer?: string;
};

// Remembers where the visitor first came from so each lead in the sheet
// shows its source (Google, an ad campaign, WhatsApp, etc.).
export function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Keep the first touch, unless the visitor arrives again through a tagged campaign link.
      if (sessionStorage.getItem(TRACKING_KEY) && !params.get("utm_source")) return;
      const data: Tracking = {
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
        landingPage: window.location.pathname,
        referrer: document.referrer || undefined,
      };
      sessionStorage.setItem(TRACKING_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable (private mode); tracking is optional.
    }
  }, []);
  return null;
}

export function readTracking(): Tracking | undefined {
  try {
    const raw = sessionStorage.getItem(TRACKING_KEY);
    return raw ? (JSON.parse(raw) as Tracking) : undefined;
  } catch {
    return undefined;
  }
}
