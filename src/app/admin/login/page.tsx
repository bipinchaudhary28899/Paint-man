import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/Logo";
import { getAdminConfig } from "@/lib/auth/config";
import { getAdminSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  const configured = getAdminConfig() !== null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="flex items-center gap-2.5">
          <Logo />
          <p className="font-display text-xl font-normal">Admin</p>
        </div>
        <h1 className="mt-6 text-2xl font-normal">Sign in to view leads</h1>
        {configured ? (
          <div className="mt-6">
            <LoginForm />
          </div>
        ) : (
          <p role="alert" className="mt-4 rounded-xl bg-peach-wash p-4 text-sm">
            Admin login is not set up. Add ADMIN_USERNAME, ADMIN_PASSWORD_HASH and SESSION_SECRET to the server
            environment (see the README).
          </p>
        )}
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-muted hover:text-tangerine-text">
          ← Back to website
        </Link>
      </div>
    </div>
  );
}
