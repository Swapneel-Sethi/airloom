# Technical writeup

Airloom, urban air quality assistant. PromptWars Virtual Main Challenge 06 submission.

## Architecture

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zod, lucide-react. Single repository, one app. No framework beyond Next.js; charts are hand-rolled SVG to keep the bundle small, SSR-safe, and dependency-light.

### Layering

- `src/lib/types.ts` — shared domain types. One source of truth for every shape that crosses client/server boundaries.
- `src/lib/aqi.ts` — US EPA AQI breakpoints on PM2.5 and PM10; other pollutants compared against WHO 2021 guideline values.
- `src/lib/environment.ts` — Open-Meteo fetch, in-memory cache, stale fallback, geocoding, reverse geocode.
- `src/lib/windows.ts` — two-hour window statistics, best/worst window selection.
- `src/lib/plan.ts` — deterministic personalized six-block daily plan engine (core differentiator).
- `src/lib/indoor.ts`, `commute.ts`, `exposure.ts`, `swaps.ts` — domain engines.
- `src/lib/demo.ts` — seeded demo environments for five cities; never mixed with live data.
- `src/lib/ai/` — isolated AI layer: `context.ts` (grounding context), `schema.ts` (Zod), `gemini.ts` (provider), `fallback.ts` (deterministic rules), `copilot.ts` (orchestrator with fallback).
- `src/components/` — UI primitives, charts, dashboard shell, location dialog, shared blocks.
- `src/app/` — App Router pages, API routes, metadata, robots, sitemap, opengraph image.

## Data flow

1. User selects a city (onboarding or settings). Profile persists to `localStorage` only.
2. Client calls `/api/environment?lat=…&lon=…&mode=live` (or demo). Server fetches Open-Meteo air quality + forecast, computes AQI, windows, and today stats, returns an `Environment` object labelled `live`, `cached`, or `demo`.
3. Client providers (`ProfileProvider`, `EnvironmentProvider`) hydrate state and re-fetch on location/mode changes.
4. `useDerived` recomputes `buildPlan`, `buildIndoorOutlook`, `compareCommute` whenever environment or profile changes.
5. Pages render from the derived plan; charts render from `environment.hourly`.
6. Assistant POSTs `/api/copilot` with question + profile; server builds a `CopilotContext`, tries Gemini, falls back to deterministic rules, returns a Zod-validated answer plus grounding metadata.

## Provenance

Every reading carries `source` (`live` | `cached` | `demo`), `freshnessMinutes`, `dataNote`, and `limitations`. Seeded demo data is labelled everywhere it appears: dashboard header, overview, and assistant grounding. Live data is never faked; when the provider fails, the last reading is shown as cached with its age.

## AQI method

AQI is computed only from PM2.5 and PM10 using US EPA breakpoints (EPA 454/B-18-007 Table 2). The dominant pollutant drives the index. NO2, SO2, O3, CO are shown against WHO 2021 guideline values as multiples of guideline. Hourly model concentrations are labelled as estimates, not 24-hour station averages.

## Exposure proxy

Exposure proxy = PM2.5 × hours × mode factor. Units: µg/m³·h. Labeled as a planning estimate, not inhaled dose and not a health risk estimate. Commute mode factors come from a fixed table (walk 1.0, cycle 1.25, transit 0.65, two-wheeler 1.1, car 0.45, remote 0.08). Emission factors: car 0.17, transit 0.103, two-wheeler 0.085 kg CO2/km; walk/cycle/remote 0.

## Indoor model

Simple mass-balance style estimate: indoor PM2.5 = outdoor PM2.5 × infiltration factor. Factor starts at 0.62, adjusts for natural (0.8), mechanical (0.45), purifier (× 0.38). Cooking adds a bump (daily +18, sometimes +9, rarely +3 µg/m³). Ventilation window = best two-hour window below 30 µg/m³. Labeled as a planning model, not a sensor reading.

## AI

Gemini 2.5 Flash via REST, isolated in `src/lib/ai/`, temperature 0.35, response schema enforced by Zod, `thinkingBudget: 0`, 22s timeout. System instruction forbids inventing numbers, diagnoses, or health promises; every number must appear in the verified context. On missing key, timeout, invalid output, or provider error, the deterministic rule engine answers with the same schema. Safety triggers (symptom, chest, breath, asthma, medic, inhaler, doctor, hospital, pregnan, heart, cough) append a calm non-medical boundary line.

## Rate limiting and errors

`/api/copilot` enforces an in-memory IP rate limit (12 requests/minute). API routes return shaped JSON errors (`code`, `message`) with appropriate status codes; no raw errors leak to the client. Environment failures degrade to cached/demo data or an empty state with a retry action.

## Accessibility and responsive

Semantic headings, landmarks, `role="img"` chart summaries, focus-visible rings, reduced-motion support, desktop header navigation plus mobile bottom tabs, color never used alone to convey state.

## Build and deploy

`next build` succeeds with zero TypeScript errors and zero lint errors. Deployed on Vercel production, linked to GitHub. `GEMINI_API_KEY` set as a Vercel environment variable; never committed.
