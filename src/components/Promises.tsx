import { Emoji, type EmojiName } from "./Emoji";
import { promises } from "@/config/site";

const icons: EmojiName[] = ["hundred-points", "receipt", "alarm-clock", "camera-with-flash", "shield", "handshake"];

/** The service promises (zero advance payment, full estimate first, timed work, documented, quality, advice in your interest) as cards. */
export function Promises({ heading = true, className = "" }: { heading?: boolean; className?: string }) {
  return (
    <section aria-labelledby={heading ? "promises-heading" : undefined} aria-label={heading ? undefined : "What you can count on"} className={className}>
      {heading && (
        <h2 id="promises-heading" className="text-3xl font-normal md:text-5xl">
          What you can <em>count on</em>
        </h2>
      )}
      <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${heading ? "mt-8" : ""}`}>
        {promises.map((p, i) => (
          <li key={p.title} className="card p-5">
            <Emoji name={icons[i % icons.length]} size={36} />
            <h3 className="mt-3 text-lg font-normal leading-tight">{p.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
