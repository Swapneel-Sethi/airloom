"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { locationLabel } from "@/lib/profile";
import type { CopilotAnswer, CopilotMeta } from "@/lib/types";
import { useEnvironment, useProfile } from "@/components/providers";
import { useDerived } from "@/components/dashboard/use-derived";
import { PageHeader } from "@/components/dashboard/blocks";
import { SectionLabel, StatusDot } from "@/components/ui";
import { cn } from "@/lib/format";

interface Grounding {
  location: string;
  source: string;
  freshnessMinutes: number;
  aqi: { value: number; category: string; dominant: string } | null;
  pm25: { label: string; value: number; unit: string; timesGuideline: number | null } | null;
  bestWindow: { label: string; pm25: number; aqi: number } | null;
  worstWindow: { label: string; pm25: number; aqi: number } | null;
  dataSource: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  question?: string;
  answer?: CopilotAnswer;
  meta?: CopilotMeta;
  grounding?: Grounding;
  error?: string;
}

const STARTERS = [
  "Should I go for a run this morning?",
  "When should I leave for work?",
  "Should I open my windows today?",
  "What can my family do indoors tonight?",
];

const PROVIDER_NAME: Record<CopilotMeta["provider"], string> = {
  nemotron: "Nemotron",
  gemini: "Gemini",
  rules: "Built in rule engine",
};

const FALLBACK_LABEL: Record<string, string> = {
  "safety-gate": "safety fallback",
  "all-providers-failed": "providers unavailable",
};

function providerLabel(meta: CopilotMeta): string {
  if (meta.provider === "rules") {
    if (meta.fallbackReason === "safety-gate") return "Safety fallback (rule engine)";
    const reason = meta.fallbackReason
      ? ` (${FALLBACK_LABEL[meta.fallbackReason] ?? meta.fallbackReason})`
      : "";
    return `Built in rule engine${reason}`;
  }
  return meta.model ? `${PROVIDER_NAME[meta.provider]} ${meta.model}` : PROVIDER_NAME[meta.provider];
}

export default function AssistantPage() {
  const { profile } = useProfile();
  const { environment, status } = useEnvironment();
  const derived = useDerived();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const messageId = useRef(0);
  const inputId = useId();

  function nextId(prefix: string): string {
    messageId.current += 1;
    return `${prefix}-${messageId.current}`;
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (trimmed.length < 2 || pending) return;
    const userMessage: Message = {
      id: nextId("u"),
      role: "user",
      question: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed, profile }),
      });
      const body = (await response.json().catch(() => null)) as
        | { answer?: CopilotAnswer; meta?: CopilotMeta; grounding?: Grounding; error?: { message?: string } }
        | null;

      if (!response.ok || !body?.answer || !body.meta) {
        setMessages((current) => [
          ...current,
          {
            id: nextId("a"),
            role: "assistant",
            error:
              body?.error?.message ??
              "The assistant is temporarily unavailable. Your personalized plan is still available in Today.",
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: nextId("a"),
          role: "assistant",
          answer: body.answer,
          meta: body.meta,
          grounding: body.grounding,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: nextId("a"),
          role: "assistant",
          error:
            "The assistant could not be reached. Check your connection, or read the plan in Today.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  const pm25 = environment?.pollutants.find((item) => item.key === "pm25") ?? null;

  return (
    <div className="space-y-8">
      <PageHeader label="Assistant" title="Ask about today">
        <p className="text-[11px] text-muted-dark">
          Grounded in your saved location, household, and plan
        </p>
      </PageHeader>

      {status === "ready" && environment ? (
        <section
          aria-label="Data available to the assistant"
          className="grid gap-3 rounded-2xl border border-line-dark bg-surface px-4 py-3 text-[11px] sm:grid-cols-4"
        >
          <div>
            <p className="text-muted-dark">Location</p>
            <p className="mt-0.5 truncate text-ink-light">{locationLabel(environment.location)}</p>
          </div>
          <div>
            <p className="text-muted-dark">Air quality index</p>
            <p className="mt-0.5 text-ink-light">
              {environment.aqi ? `${environment.aqi.value} ${environment.aqi.categoryLabel}` : "Unavailable"}
            </p>
          </div>
          <div>
            <p className="text-muted-dark">PM2.5</p>
            <p className="tnum mt-0.5 text-ink-light">
              {pm25?.value !== null && pm25?.value !== undefined
                ? `${formatNumber(pm25.value, 0)} µg/m³`
                : "Unavailable"}
            </p>
          </div>
          <div>
            <p className="text-muted-dark">Low window</p>
            <p className="mt-0.5 text-ink-light">
              {derived?.plan.bestWindow?.label ?? "Unavailable"}
            </p>
          </div>
        </section>
      ) : null}

      <section aria-label="Conversation" aria-live="polite" className="min-h-[280px] space-y-8 pb-24 sm:pb-0">
        {messages.length === 0 ? (
          <div className="border-t border-line-dark pt-8">
            <p className="max-w-xl text-sm leading-relaxed text-muted-dark">
              Airloom answers with the numbers already on this page: the current model reading,
              the hourly windows, your household profile, and the deterministic plan. It explains
              decisions. It does not produce new measurements.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => ask(starter)}
                  className="min-h-11 rounded-xl border border-line-dark px-4 py-3 text-left text-[13px] text-ink-light transition-colors hover:border-white/30 hover:bg-white/5"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-light">
                {message.question}
              </p>
            </div>
          ) : (
            <article key={message.id} className="max-w-3xl border-l border-line-dark pl-4 sm:pl-6">
              {message.error ? (
                <div>
                  <p className="text-sm text-amber">{message.error}</p>
                  <p className="mt-1 text-[11px] text-muted-dark">
                    The deterministic plan is unaffected.
                  </p>
                </div>
              ) : message.answer && message.meta ? (
                <>
                  <p className="text-[15px] leading-relaxed text-ink-light">
                    {message.answer.recommendation}
                  </p>

                  <div className="mt-4">
                    <SectionLabel tone="dark">Why</SectionLabel>
                    <ul className="mt-2 space-y-1.5">
                      {message.answer.why.map((item) => (
                        <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-muted-dark">
                          <span aria-hidden="true" className="text-line-dark">
                            -
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <SectionLabel tone="dark">What to do</SectionLabel>
                    <ol className="mt-2 space-y-1.5">
                      {message.answer.whatToDo.map((item, index) => (
                        <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-muted-dark">
                          <span className="tnum text-[11px] text-muted-dark/60">{index + 1}.</span>
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-4">
                    <SectionLabel tone="dark">Alternative</SectionLabel>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-dark">
                      {message.answer.alternative}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {message.answer.dataUsed.map((item) => (
                      <span
                        key={item}
                        className="rounded border border-line-dark px-1.5 py-0.5 text-[10px] text-muted-dark"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {message.answer.safetyNote ? (
                    <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-amber">
                      {message.answer.safetyNote}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-dark">
                    <span className="flex items-center gap-1.5">
                      <StatusDot
                        color={
                          message.meta.provider === "rules"
                            ? "var(--sev-moderate)"
                            : "var(--sev-good)"
                        }
                      />
                      {providerLabel(message.meta)}
                    </span>
                    <span className="tnum">{message.meta.latencyMs} ms</span>
                    <span>{message.meta.promptVersion}</span>
                    {message.grounding ? <span>{message.grounding.dataSource}</span> : null}
                  </div>
                </>
              ) : null}
            </article>
          ),
        )}

        {pending ? (
          <div className="flex items-center gap-2 text-xs text-muted-dark" role="status">
            <LoaderCircle size={14} className="animate-spin" />
            Reading the plan and the hourly forecast
          </div>
        ) : null}
        <div ref={endRef} />
      </section>

      <section className="sticky bottom-14 z-10 -mx-1 border-t border-line-dark bg-night/95 px-1 pb-2 pt-3 backdrop-blur lg:bottom-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void ask(input);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor={inputId} className="sr-only">
            Ask about today&apos;s air
          </label>
          <input
            id={inputId}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={600}
            placeholder="Ask about a run, a commute, windows, or tonight"
            className="h-12 w-full rounded-xl border border-line-dark bg-surface px-4 text-sm text-ink-light outline-none placeholder:text-muted-dark focus:border-white/40"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || input.trim().length < 2}
            className={cn(
              "inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink-light text-night transition-opacity",
              (pending || input.trim().length < 2) && "opacity-40",
            )}
            aria-label="Send question"
          >
            <ArrowUp size={18} />
          </button>
        </form>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-dark">
          Answers use the verified context for this location. Not a medical service.
        </p>
      </section>
    </div>
  );
}
