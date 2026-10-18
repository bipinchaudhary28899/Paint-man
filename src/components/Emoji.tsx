import Image from "next/image";

// 3D emoji from Microsoft Fluent Emoji (MIT licence), stored in /public/emoji.
export type EmojiName =
  | "handshake" | "receipt" | "artist-palette" | "check-mark-button" | "camera-with-flash" | "paintbrush"
  | "house" | "house-with-garden" | "key" | "sparkles" | "spiral-calendar" | "straight-ruler" | "clipboard"
  | "round-pushpin" | "party-popper" | "magnifying-glass-tilted-left" | "broom" | "rocket" | "telephone-receiver"
  | "speech-balloon" | "star-struck" | "shield" | "glowing-star" | "rainbow" | "droplet" | "sun" | "cloud-with-rain"
  | "sparkling-heart" | "mobile-phone" | "alarm-clock" | "light-bulb" | "crayon" | "hundred-points" | "fire";

export function Emoji({ name, size = 56, className = "" }: { name: EmojiName; size?: number; className?: string }) {
  return (
    <Image
      src={`/emoji/${name}.png`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`pointer-events-none select-none drop-shadow-[0_6px_8px_rgba(18,16,22,0.18)] ${className}`}
    />
  );
}
