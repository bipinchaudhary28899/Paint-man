import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <h1 className="text-3xl font-normal text-brand-900">Page not found</h1>
      <p className="mt-3 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-secondary text-brand-700">Home</Link>
        <Link href="/book" className="btn-primary">Book an inspection</Link>
      </div>
    </div>
  );
}
