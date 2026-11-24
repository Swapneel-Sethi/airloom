import Link from "next/link";
import { cn } from "@/lib/format";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("size-6", className)}
      fill="none"
    >
      <path
        d="M4 26c5.5 0 6.8-11 12.3-11s6.9 11 12.4 11c2.6 0 4.6-2.2 5.3-4.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="15" r="2.6" fill="#00d084" />
    </svg>
  );
}

export function Wordmark({
  tone = "light",
  href = "/",
}: {
  tone?: "light" | "dark";
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center gap-2.5 text-[17px] tracking-[-0.01em]",
        tone === "dark" ? "text-ink-light" : "text-ink",
      )}
      aria-label="Airloom home"
    >
      <Mark />
      Airloom
    </Link>
  );
}
