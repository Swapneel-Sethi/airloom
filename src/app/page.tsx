import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  House,
  Leaf,
  MessageSquare,
  ShieldCheck,
  Wind,
} from "lucide-react";
import { Wordmark } from "@/components/logo";
import { buttonClass, SectionLabel, StatusDot } from "@/components/ui";
import { SITE } from "@/lib/constants";

const SHIFTS = [
  {
    icon: CalendarDays,
    title: "A day plan, not a number",
    body: "Six blocks from morning to night. Each block names the action, the time window, and the reason behind it.",
  },
  {
    icon: Wind,
    title: "Exposure you can compare",
    body: "Concentration times hours, with commute mode factors. See the plan against your current routine before you change anything.",
  },
  {
    icon: House,
    title: "Indoor guidance",
    body: "An infiltration estimate from your windows, purifier, and cooking. Real ventilation windows, not blanket advice.",
  },
  {
    icon: CarFront,
    title: "Commute comparison",
    body: "Time, exposure proxy, and estimated CO2 for every mode you can actually use, at the hour you actually leave.",
  },
  {
    icon: Leaf,
    title: "Swaps with a stated basis",
    body: "Timing first, then mode, then equipment. Every swap lists its effort, frequency, and the assumption behind the number.",
  },
  {
    icon: MessageSquare,
    title: "A grounded assistant",
    body: "The copilot reads the same plan and forecast. Every answer lists the data it used, and falls back to rules when the model is unavailable.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Read",
    body: "Hourly PM2.5, PM10, NO2, SO2, O3 and CO from the Open-Meteo air quality model, plus weather for the same coordinate.",
  },
  {
    number: "02",
    title: "Compute",
    body: "US EPA sub indices, two hour low and high windows, an exposure proxy, and an indoor infiltration estimate. Deterministic and testable.",
  },
  {
    number: "03",
    title: "Explain",
    body: "The plan renders from those calculations. The assistant answers questions against the same numbers and cites the fields it used.",
  },
];

const DAY_MOCK = [
  { time: "06:30", action: "Move the run to 17:00", tag: "Activity" },
  { time: "08:30", action: "Take the metro, not the scooter", tag: "Commute" },
  { time: "13:00", action: "Keep windows closed through the afternoon", tag: "Indoor" },
  { time: "19:00", action: "Purifier in the room you use tonight", tag: "Indoor" },
];

export default function LandingPage() {
  return (
    <div className="bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/92 backdrop-blur">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
            <a href="#product" className="text-[13px] text-muted hover:text-ink">
              Product
            </a>
            <a href="#method" className="text-[13px] text-muted hover:text-ink">
              Method
            </a>
            <a href="#assistant" className="text-[13px] text-muted hover:text-ink">
              Assistant
            </a>
            <a href="#data" className="text-[13px] text-muted hover:text-ink">
              Data
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/onboarding" className="hidden text-[13px] text-muted hover:text-ink sm:inline-flex">
              Set up
            </Link>
            <Link href="/dashboard" className={buttonClass("solid", "h-10 px-4 text-[13px]")}>
              Open the demo
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="shell grid gap-12 pb-16 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="rise">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-md border border-line px-2 py-1 text-[11px] text-muted">
                <StatusDot color="#0a0a0a" />
                PromptWars Challenge 06
              </span>
              <span className="text-[11px] text-muted">Urban air quality assistant</span>
            </div>

            <h1 className="mt-6 max-w-[16ch] text-[clamp(2.9rem,7vw,4.9rem)] leading-[0.98] tracking-[-0.045em]">
              Breathe smarter through polluted days.
            </h1>

            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted">
              Airloom turns an hourly air quality forecast into a personal plan for the day. When
              to move, when to stay in, how to travel, and what to change first. Every number is
              labelled, and every recommendation says why.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className={buttonClass("solid")}>
                See today&apos;s plan
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/onboarding" className={buttonClass("outline")}>
                Set up my city
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-5">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Forecast</dt>
                <dd className="mt-1 text-[13px]">Hourly, 2 days</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Plan</dt>
                <dd className="mt-1 text-[13px]">6 daily blocks</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Provenance</dt>
                <dd className="mt-1 text-[13px]">Live, cached, demo</dd>
              </div>
            </dl>
          </div>

          <div className="rise">
            <div className="rounded-3xl bg-night p-5 text-ink-light sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-line-dark pb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                    Today in Delhi
                  </p>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span className="tnum text-5xl leading-none tracking-[-0.04em]">236</span>
                    <div className="pb-1">
                      <div className="flex items-center gap-1.5">
                        <StatusDot color="var(--sev-very-high)" pulse />
                        <span className="text-[13px]">Very high</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-dark">PM2.5 dominant</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-dark">
                    PM2.5 178 µg/m³ / 11.9x the WHO 2021 24 hour guideline
                  </p>
                </div>
                <span className="rounded-md border border-line-dark px-2 py-1 text-[10px] text-muted-dark">
                  Demo scenario
                </span>
              </div>

              <div className="py-5">
                <div className="flex items-center justify-between text-[10px] text-muted-dark">
                  <span>06:00</span>
                  <span>PM2.5 over the next 24 hours</span>
                  <span>06:00</span>
                </div>
                <svg viewBox="0 0 320 74" className="mt-2 w-full" aria-hidden="true">
                  <line x1="0" y1="62" x2="320" y2="62" stroke="#242424" strokeWidth="1" />
                  <line x1="0" y1="34" x2="320" y2="34" stroke="#242424" strokeWidth="1" />
                  <line x1="0" y1="8" x2="320" y2="8" stroke="#242424" strokeWidth="1" />
                  <path
                    d="M0 48 C 18 46, 26 24, 44 20 S 74 40, 96 44 S 128 58, 152 56 S 186 30, 210 34 S 246 54, 268 52 S 300 40, 320 38"
                    fill="none"
                    stroke="#f4f3f0"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <line
                    x1="44"
                    y1="6"
                    x2="44"
                    y2="62"
                    stroke="#00d084"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <circle cx="44" cy="20" r="3" fill="#00d084" />
                </svg>
              </div>

              <ul className="space-y-3 border-t border-line-dark pt-5">
                {DAY_MOCK.map((item) => (
                  <li key={item.time} className="flex items-start gap-3">
                    <span className="tnum w-10 shrink-0 pt-0.5 text-[11px] text-muted-dark">
                      {item.time}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] leading-snug">{item.action}</span>
                    <span className="shrink-0 pt-0.5 text-[10px] text-muted-dark">{item.tag}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-line-dark px-3 py-2.5">
                <span className="text-[11px] text-muted-dark">Exposure proxy with this plan</span>
                <span className="tnum text-[11px] text-ink-light">34% lower</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Seeded Delhi scenario shown for a complete walkthrough. Live readings use the same
              layout with a live provenance label.
            </p>
          </div>
        </section>

        <section className="border-y border-line bg-[#faf9f6]">
          <div className="shell flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px]">
              Most air quality apps stop at a number. Airloom starts with a decision.
            </p>
            <p className="text-[11px] text-muted">
              Model data from Open-Meteo, plan logic deterministic, assistant optional
            </p>
          </div>
        </section>

        <section className="shell py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionLabel>The problem</SectionLabel>
              <h2 className="mt-3 max-w-[18ch] text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                An index is not a plan.
              </h2>
            </div>
            <div className="max-w-xl space-y-4 text-[15px] leading-relaxed text-muted">
              <p>
                On a polluted day a household makes a dozen small decisions: whether the run
                happens, which route to work, when to open the windows, whether the purifier earns
                its power, what to change next month.
              </p>
              <p>
                A single AQI number answers none of them. And a generic advisory, printed for a
                whole city, misses the household, the hour, and the trade off.
              </p>
              <p className="text-ink">
                Airloom is built for the decision, with the number attached and its limits stated.
              </p>
            </div>
          </div>
        </section>

        <section id="product" className="border-t border-line bg-[#faf9f6]">
          <div className="shell py-16 lg:py-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionLabel>What it does</SectionLabel>
                <h2 className="mt-3 max-w-[20ch] text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                  Six pieces, one day.
                </h2>
              </div>
              <p className="max-w-sm text-[13px] leading-relaxed text-muted">
                Each view answers a different decision, and all of them read from the same hourly
                forecast and the same household profile.
              </p>
            </div>

            <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {SHIFTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="border-t border-line pt-5">
                    <Icon size={18} aria-hidden="true" className="text-ink" />
                    <h3 className="mt-4 text-[15px]">{item.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-12">
              <Link href="/dashboard/today" className={buttonClass("solid")}>
                Walk through a full day
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section id="method" className="shell py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionLabel>Method</SectionLabel>
              <h2 className="mt-3 max-w-[16ch] text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                Read, compute, then explain.
              </h2>
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
                The recommendation engine does not call a language model. It is a deterministic
                calculation over the forecast and your saved context, which is why the same inputs
                produce the same plan.
              </p>
            </div>
            <ol className="space-y-8">
              {STEPS.map((step) => (
                <li key={step.number} className="grid grid-cols-[48px_1fr] gap-4 border-t border-line pt-5">
                  <span className="tnum text-[11px] text-muted">{step.number}</span>
                  <div>
                    <h3 className="text-lg">{step.title}</h3>
                    <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="assistant" className="bg-night text-ink-light">
          <div className="shell grid gap-12 py-16 lg:grid-cols-[1fr_1fr] lg:py-24">
            <div>
              <SectionLabel tone="dark">Assistant</SectionLabel>
              <h2 className="mt-3 max-w-[18ch] text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                An answer should show its work.
              </h2>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-muted-dark">
                The copilot receives a verified context object: current AQI, pollutant values, low
                and high windows, the day plan, commute comparison, and the indoor estimate. The
                reply is validated against a schema before it reaches the page.
              </p>
              <ul className="mt-6 space-y-3 text-[13px] text-muted-dark">
                <li className="flex gap-2.5">
                  <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
                  Rules answer first when no key is configured or the model fails.
                </li>
                <li className="flex gap-2.5">
                  <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
                  Every reply lists the data fields it used.
                </li>
                <li className="flex gap-2.5">
                  <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-green" />
                  Symptom and medication questions get a clear boundary, not a diagnosis.
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-line-dark bg-surface p-5 sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                Question
              </p>
              <p className="mt-2 text-[15px]">Should I go for a run this morning?</p>

              <div className="mt-5 border-t border-line-dark pt-5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                  Airloom
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">
                  Move the run to 17:00. The morning peak is the highest two hour window today,
                  and the evening window is 38 percent lower.
                </p>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">Why</p>
                  <p className="text-[13px] leading-relaxed text-muted-dark">
                    PM2.5 is 178 µg/m³ now. The lowest two hour average is 96 µg/m³ between 16:00
                    and 18:00. Your household includes a child, so the planning threshold is 30
                    µg/m³ rather than 40.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-dark">
                    What to do
                  </p>
                  <p className="text-[13px] leading-relaxed text-muted-dark">
                    Run the loop at 17:00 rather than 06:30. Keep it under 40 minutes. Warm up
                    indoors and skip the outdoor cooldown.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["AQI and dominant pollutant", "Hourly PM2.5 forecast", "Household sensitivity"].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded border border-line-dark px-1.5 py-0.5 text-[10px] text-muted-dark"
                      >
                        {item}
                      </span>
                    ),
                  )}
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-dark/70">
                  <StatusDot color="var(--sev-good)" />
                  Gemini response, schema validated
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="data" className="shell py-16 lg:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>Provenance</SectionLabel>
              <h2 className="mt-3 max-w-[20ch] text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                You always know what you are reading.
              </h2>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-muted">
              Airloom never presents seeded data as live. The source label travels with the plan,
              the charts, and the assistant.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Live",
                color: "var(--sev-good)",
                body: "Fetched from the Open-Meteo model for your coordinate in the last 30 minutes. Model hour is shown.",
              },
              {
                label: "Cached",
                color: "var(--sev-elevated)",
                body: "An earlier reading kept in memory because the provider did not respond. The age is shown in minutes.",
              },
              {
                label: "Demo",
                color: "var(--sev-moderate)",
                body: "A seeded scenario for walkthroughs, built from a fixed diurnal curve. Labelled wherever it appears.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-line p-5">
                <div className="flex items-center gap-2">
                  <StatusDot color={item.color} />
                  <p className="text-sm">{item.label}</p>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Air quality</p>
              <p className="mt-1.5 text-[12px] leading-relaxed">
                Open-Meteo air quality model, hourly pollutants for the selected coordinate.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Weather</p>
              <p className="mt-1.5 text-[12px] leading-relaxed">
                Open-Meteo forecast for temperature, humidity, wind, and precipitation.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Index</p>
              <p className="mt-1.5 text-[12px] leading-relaxed">
                US EPA breakpoints applied to PM2.5 and PM10. Other pollutants compared with WHO
                2021 guidelines.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Your profile</p>
              <p className="mt-1.5 text-[12px] leading-relaxed">
                Stored in this browser only. No account, no server side profile database.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-[#faf9f6]">
          <div className="shell grid gap-10 py-16 lg:grid-cols-[1fr_1fr] lg:py-24">
            <div>
              <SectionLabel>Sustainability</SectionLabel>
              <h2 className="mt-3 max-w-[18ch] text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                Lower exposure and lower emissions can point the same way.
              </h2>
            </div>
            <div className="max-w-xl">
              <p className="text-[15px] leading-relaxed text-muted">
                Moving one trip from a private vehicle to transit lowers the exposure proxy for most
                commutes and the estimated CO2 for the trip. Airloom compares the options you can
                actually use, at the hour you actually leave, and states the emission factor behind
                each figure.
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-muted">
                It is a planning estimate with a stated basis, not a life cycle audit. The app says
                so next to the number.
              </p>
              <Link href="/dashboard/swaps" className={buttonClass("solid", "mt-6")}>
                See the impact simulator
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="shell py-16 lg:py-24">
          <div className="rounded-3xl bg-night px-6 py-10 text-ink-light sm:px-10 sm:py-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <SectionLabel tone="dark">Start here</SectionLabel>
                <h2 className="mt-3 max-w-[22ch] text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                  Open the Delhi scenario and walk a full day.
                </h2>
                <p className="mt-4 max-w-md text-[13px] leading-relaxed text-muted-dark">
                  The demo profile is loaded with a family, a purifier, and a scooter commute. No
                  sign up, no key required. Live data works the same way once you choose your city.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard" className={buttonClass("dark")}>
                  Open dashboard
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/onboarding" className={buttonClass("darkOutline")}>
                  Use my city
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="shell flex flex-col gap-6 py-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-md text-[11px] leading-relaxed text-muted">{SITE.disclaimer}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-muted">
            <Link href="/dashboard" className="hover:text-ink">
              Dashboard
            </Link>
            <Link href="/onboarding" className="hover:text-ink">
              Onboarding
            </Link>
            <a href="#method" className="hover:text-ink">
              Method
            </a>
            <a href="#data" className="hover:text-ink">
              Data
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
