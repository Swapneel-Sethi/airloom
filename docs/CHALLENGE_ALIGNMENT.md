# Challenge alignment

Airloom against the PromptWars Virtual Main Challenge 06 requirements.

## Product

- Name: Airloom. Tagline: "Breathe smarter through polluted days."
- Positioning: decision support, not an AQI dashboard. Every view answers a household decision (run, commute, windows, purifier, swaps) with the number attached and its limits stated.

## Required features

| Requirement | Status | Where |
|---|---|---|
| Landing | Done | `/` |
| Location onboarding | Done | `/onboarding` |
| Dashboard | Done | `/dashboard` |
| Air intelligence charts | Done | hand-rolled SVG `TrendChart` on Overview, Exposure |
| Personalized 6-block daily plan | Done | `src/lib/plan.ts`, `/dashboard/today` |
| Routine builder | Done | `/dashboard/today` routine builder fields |
| Commute comparison | Done | `/dashboard/exposure`, mode × time × CO2 table |
| Indoor guidance | Done | `/dashboard/indoor`, infiltration + ventilation window |
| Sustainable swaps | Done | `/dashboard/swaps`, impact simulator |
| Grounded AI copilot with structured response | Done | `/api/copilot`, Zod schema, Gemini + rules fallback |
| "Why this recommendation" | Done | every plan block and copilot answer has `why` |
| Data provenance classes | Done | `live` / `cached` / `demo` label on every reading |
| Deterministic AQI + exposure proxy | Done | `src/lib/aqi.ts`, `src/lib/exposure.ts` |
| Impact simulator | Done | `/dashboard/swaps`, baseline vs planned exposure proxy |
| Demo / judge mode | Done | default profile is Delhi demo, `dataMode: "demo"` |
| Error and empty states | Done | provider failure, missing AQI, no transport options |
| Responsive | Done | desktop header + mobile bottom tabs, verified at 1440/820/390 |
| Accessible | Done | focus rings, chart aria labels, reduced motion, semantic HTML |
| Metadata | Done | `layout.tsx` metadata, viewport, open graph |
| Docs | Done | README, DESIGN.md, docs/*.md, .env.example |

## Data

- Open-Meteo geocoding, air quality, weather.
- Clear live vs demo vs cached labeling; no fake live data.

## AI

- Gemini 2.5 Flash isolated in `src/lib/ai/`.
- Zod validation of model output.
- Deterministic fallback when key missing or provider fails.

## Copy rules honored

- No em dashes or en dashes (verified in tests).
- No generic AI marketing language.
- No fabricated stats, testimonials, partnerships, or medical claims.
- Airloom is not a medical service; safety boundary on symptom/medication questions.

## Stack

Next.js 16.4.6, React 19.3.0, Tailwind 4.3.3, TypeScript, Zod, lucide-react, Gemini 2.5 Flash, Open-Meteo.
