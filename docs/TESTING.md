# Testing

## Commands

- `npm run lint` — eslint across the project.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run test` — `tsx --test scripts/selfcheck.test.ts` (node:test).
- `npm run build` — `next build` (production build, static pages + TypeScript check).

## Unit tests

`scripts/selfcheck.test.ts` — 13 tests, 0 failures:

1. PM2.5 breakpoints follow the US EPA table (0, 12, 35.4, 55.4, 150.4, 500).
2. AQI is null with no pollutants; picks dominant sub index.
3. AQI category boundaries (50/51/101/201/301).
4. Exposure proxy multiplies concentration × hours × mode factor; proxyDelta guards zero baseline.
5. Every demo city produces a complete labelled environment (source demo, AQI, today stats, ≥48 hourly points, pollutants, dataNote, limitations).
6. Plan is deterministic for identical inputs (deep equal across runs).
7. Plan blocks carry action, reason, why (≥2 items), basis, time range; six blocks; best ≤ worst window.
8. Sensitive households get tighter thresholds (sensitive vs standard).
9. Commute options sorted by exposure proxy; at least one recommended; finite exposure/CO2/why.
10. Indoor estimate lower than outdoor with purifier; infiltration factor lower than natural-only; rooms ≥2; ventilation window below 30 µg/m³ when present.
11. Swaps populated with title, basis, impact, horizon; at least one daily-frequency swap.
12. Copilot schema rejects missing fields and empty why arrays.
13. Rule engine answers without a model; safety language on symptom questions; no em/en dashes in answers.

## Type safety

TypeScript strict via `tsc --noEmit`. `satisfies CommuteOption` and narrowed `CommuteOption | null` map used in commute mapping.

## Lint

eslint-config-next (web vitals + typescript rules). Zero errors; four `react-hooks/set-state-in-effect` warnings retained as intentional hydration/fetch patterns (localStorage rehydration and effect-triggered refetch).

## Visual QA

Rendered all routes at desktop (1440), tablet (820), and mobile (390) with Playwright-driven headless Chrome; checked for horizontal overflow (all scrollWidths equal viewport width) and layout breakage. Screenshots retained in temp for reference.

## Production build

`next build` completes: 18 routes (14 static, 4 dynamic API routes), opengraph image, robots.txt, sitemap.xml generated. TypeScript check passes during build.
