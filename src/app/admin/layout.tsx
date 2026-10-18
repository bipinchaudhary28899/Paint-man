import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="min-h-screen bg-cream">{children}</main>;
}
