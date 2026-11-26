import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { Wordmark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-night text-ink-light flex flex-col items-center justify-center py-20 sm:py-32">
      <Wordmark tone="dark" />
      <div className="mt-10 text-center">
        <h1 className="text-3xl tracking-[-0.02em] sm:text-5xl">Page not found</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-dark">
          The page you are looking for does not exist. Return to Airloom and continue your plan.
        </p>
        <div className="mt-8">
          <Link href="/dashboard" className={buttonClass("dark")}>
            Back to dashboard <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
