import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";

const SECTIONS = [
  { key: "leads", href: "/admin", label: "Leads" },
  { key: "projects", href: "/admin/projects", label: "Projects" },
] as const;

export type AdminSection = (typeof SECTIONS)[number]["key"];

/**
 * The top of every signed-in admin page: the mark, the page's h1, who is signed in (plus any line
 * the page adds, such as when it was loaded), the Leads / Projects switch and sign-out.
 */
export function AdminHeader({ title, user, current, children }: { title: string; user: string; current: AdminSection; children?: ReactNode }) {
  return (
    <header className="border-b border-line pb-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo />
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-normal">{title}</h1>
            <p className="text-xs text-muted">
              Signed in as {user}
              {children ? <> · {children}</> : null}
            </p>
          </div>
        </div>
        <SignOutButton />
      </div>
      <nav aria-label="Admin" className="mt-4 flex gap-2">
        {SECTIONS.map((s) => {
          const active = s.key === current;
          return (
            <Link
              key={s.key}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ${active ? "bg-ink text-on-ink" : "border border-line-strong text-ink hover:bg-chalk"}`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
