// Brand mark from the PaintMan design: a terracotta dab beside the serif wordmark.
export function Logo({ className = "h-3 w-3" }: { className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full bg-terracotta-light ${className}`} />;
}
