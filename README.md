# Airloom

Breathe smarter through polluted days. Airloom turns an hourly air quality forecast into a personal decision plan for households in polluted cities — not just another AQI dashboard.

**PromptWars Virtual Main Challenge 06 submission**

## Live

- GitHub: https://github.com/Swapneel-Sethi/airloom
- Vercel: https://airloom.vercel.app

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zod, lucide-react, Gemini 2.5 Flash (optional), Open-Meteo (free, no key).

## Data sources

- Open-Meteo air quality model: hourly PM2.5, PM10, NO2, SO2, O3, CO, AQI for the selected coordinate.
- Open-Meteo forecast: temperature, humidity, wind.
- Open-Meteo geocoding: city search and reverse geocode.

Every reading carries a provenance label: live, cached (stale fallback), or demo (seeded scenario). Seeded data is never presented as live.

## What Airloom does

Airloom is decision support, not an index. On a polluted day a household makes many small calls: whether the run happens, which route to work, when to open windows, whether the purifier earns its power, what to change next month. A single AQI number answers none of them.

1. **Read** — Hourly pollutants and weather from Open-Meteo.
2. **Compute** — US EPA AQI breakpoints on PM2.5 and PM10, two-hour low and high windows, an exposure proxy (concentration × hours × mode factor), and an indoor infiltration estimate. Deterministic and testable.
3. **Plan** — Six daily blocks (morning, commute, midday, afternoon, evening, night), each with an action, time window, reason, confidence, and stated basis.
4. **Explain** — A grounded copilot answers questions against the same context, lists the data fields it used, and falls back to a built-in rule engine when Gemini is unavailable or fails.

## Features

- Landing page with product, method, assistant, provenance, and sustainability sections.
- Location onboarding: city search, "use my location", seeded demo cities (Delhi, Mumbai, Bengaluru, Kolkata, Lucknow), and a Delhi judge scenario.
- Dashboard: Overview, Today, Exposure, Indoor, Swaps, Assistant, Settings.
- Desktop nav + mobile bottom tabs; responsive layouts verified at desktop/tablet/mobile.
- Hand-rolled SVG charts (no recharts), thin lines, WHO guideline markers, hover tooltips, reduced-motion safe.
- Personalized 6-block daily plan that rolls already-passed blocks to tomorrow, so demos work at any hour.
- Commute comparison: time, exposure proxy, estimated CO2 per mode at the saved departure hour.
- Indoor guidance: infiltration estimate from windows/purifier/cooking, real ventilation windows below a 30 µg/m³ threshold.
- Sustainable swaps with stated basis and emission factors (car 0.17, transit 0.103, two wheeler 0.085 kg CO2/km).
- Grounded AI copilot with Zod-validated structured responses, safety boundaries for symptom/medication questions, and deterministic fallback.
- "Why this recommendation" on every plan block; data provenance classes on every reading.
- Error and empty states; metadata, robots.txt, sitemap.xml, opengraph image.
- `.env.example` for `GEMINI_API_KEY`, `GEMINI_MODEL`, `NEXT_PUBLIC_SITE_URL`.

## Copy rules

No em dashes or en dashes. No generic AI marketing language. No fabricated stats, testimonials, partnerships, or medical claims. Airloom is not a medical service.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # production server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # node:test via tsx, scripts/selfcheck.test.ts
```

## Testing

Unit tests in `scripts/selfcheck.test.ts` cover AQI breakpoints, exposure proxy, plan determinism, sensitive thresholds, commute options, indoor estimates, swaps basis, copilot schema validation, and rule-engine answers including safety language. 13 tests pass.

Visual QA: rendered desktop, tablet, and mobile screenshots of all routes checked for overflow and layout issues before commit.

## Deployment

Vercel production deployment linked to the `airloom` GitHub repo. `GEMINI_API_KEY` is set as a Vercel environment variable (never committed). Without the key the assistant uses the built-in rule engine.

## Remaining submission step

Document the Google Antigravity requirement as a remaining step if it applies to this challenge.

## License

MIT
