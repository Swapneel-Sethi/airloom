# Testing

## Commands

- `npm run lint` - eslint across the project.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run test` — `tsx --test tests/**/*.test.ts` (node:test).
- `npm run build` — `next build` (production build, static pages + TypeScript check).

## Unit tests

Canonical test suite: `tests/` — 82 tests, 0 failures:

### AQI & categories (7 tests)
1. PM2.5 breakpoints follow the US EPA 2024 table (0, 9.0, 35.4, 55.4, 150.4, 500).
2. AQI is null with no pollutants; picks dominant sub index.
3. AQI category boundaries (50/51/101/201/301).
4. AQI breakpoint edges handled.
5. categoryFor covers all category edges.
6. CO2 ordering: transit < two-wheeler < car (India GHG Program).
7. Clamp helper keeps values within bounds.

### Plan & windows (7 tests)
8. Plan is deterministic for identical inputs (deep equal across runs).
9. Plan blocks carry action, reason, why (≥2 items), basis, time range; six blocks; best ≤ worst window.
10. Sensitive households get tighter thresholds (sensitive vs standard).
11. Plan does not recommend past windows.
12. Plan best and worst window are single source of truth.
13. Indoor and plan use same household threshold.
14. Plan blocks carry action, reason, why (≥2 items), basis, time range.

### Indoor & exposure (2 tests)
15. Indoor estimate lower than outdoor with purifier; infiltration factor lower than natural-only; rooms ≥2; ventilation window below 30 µg/m³ when present.
16. Exposure proxy multiplies concentration × hours × mode factor; proxyDelta guards zero baseline.

### Commute (5 tests)
17. Commute options sorted by exposure proxy; at least one recommended; finite exposure/CO2/why.
18. Commute does not invent modes when none selected.
19. Commute recommends lower-emission option within exposure band.
20. Remote work is No trip not 0 minutes for distance.
21. CO2 ordering: transit < two-wheeler < car (India GHG Program).

### Swaps (2 tests)
22. Swaps populated with title, basis, impact, horizon; at least one daily-frequency swap.
23. Swaps do not show negative or zero savings as meaningful.

### Demo environment (3 tests)
24. Every demo city produces a complete labelled environment (source demo, AQI, today stats, ≥48 hourly points, pollutants, dataNote, limitations).
25. Provenance never claims demo is live Open-Meteo.
26. Demo city consistency: demo environment uses demoCity.

### Profile management (14 tests)
27. DEFAULT_PROFILE remains unchanged.
28. judgeProfile returns seeded demo profile with onboarded true.
29. freshOnboardingProfile does not modify DEFAULT_PROFILE and starts blank.
30. repairProfile preserves valid fields when one field is invalid.
31. repairProfile drops only the invalid location, keeps everything else.
32. parseStoredProfile repairs malformed legacy profile instead of returning null.
33. effectiveLocation returns demo city location in demo mode.
34. Legacy airloom.profile.v1 migrates to User 1 preserving every field.
35. Migration does not run when profiles store already exists.
36. Creation of User 1 uses fresh blank profile.
37. Creation of User 2 uses the next available number.
38. Unique IDs on repeated creation.
39. Unique names on repeated creation.
40. Next available number skips deleted numbers.
41. Existing profile names are not renamed after deletion.
42. Switching between profiles keeps separate data.
43. Updating User 1 does not affect User 2.
44. Updating User 2 does not affect User 1.
45. Active profile persistence.
46. Logout clears active id.
46. New user creates a fresh blank profile.
47. Delete inactive profile keeps active profile unchanged.
48. Delete active profile switches to another existing profile.
49. Delete final profile leaves no active profile.
50. Demo profile remains functional and is separate from user profiles.
51. parseProfiles validates and deduplicates stored profiles.
52. Onboarding does not reset an existing profile (fresh profile used only at creation).

### AI provider pipeline (7 tests)
53. Nemotron provider is available when key is configured.
54. Nemotron provider is unavailable when key is not configured.
55. Gemini provider is available when key is configured.
56. Gemini provider is unavailable when key is not configured.
57. Deterministic provider is always available.
58. ProviderRegistry runs Nemotron first.
59. Safety gate runs before any model call.

### Grounding validation (4 tests)
60. Grounding rejects unsupported numbers.
61. Grounding accepts numbers from verified context.
62. Grounding handles decimal values correctly.
63. Grounding handles time ranges correctly.

### Contradiction validation (3 tests)
64. Contradiction validation rejects contradictory time ranges.
65. Contradiction validation accepts consistent answers.
66. Contradiction validation rejects unsupported time recommendations.

### Fallback & safety (5 tests)
67. Rule engine answers without a model; safety language on symptom questions; no em/en dashes.
68. Acute health scenarios are detected.
69. Safety gate runs before any model provider.
69. Non-acute questions do not trigger safety gate.
70. Safety response does not recommend outdoor windows.

### API schema validation (3 tests)
71. Copilot schema rejects malformed model output.
72. Copilot schema validates all required fields.
73. Copilot schema rejects empty arrays for why and whatToDo.
74. Copilot schema allows empty dataUsed (has default).

### CSP (1 test)
75. CSP script-src allows Next.js inline hydration scripts.

### Intent routing (6 tests)
76. Fallback intent routing: safety, off-topic, purifier, windows, commute, activity, family, swaps.
77. Outdoor activity intent routing: child + activity + time.
78. Outdoor activity intent: activity without child.
79. Outdoor activity intent: activity + time without child.
79. Family intent: child without activity + time.
80. Indoor-windows intent: windows at night.
81. Word boundaries prevent car matching care and walk hijacking family.

### Helpers (1 test)
82. Clamp helper keeps values within bounds.

## Type safety

TypeScript strict via `tsc --noEmit`. `satisfies CommuteOption` and narrowed `CommuteOption | null` map used in commute mapping.

## Lint

eslint-config-next (web vitals + typescript rules). Zero errors, zero warnings.

## Visual QA

Rendered all routes at desktop (1440), tablet (820), and mobile (390) with Playwright-driven headless Chrome; checked for horizontal overflow (all scrollWidths equal viewport width) and layout breakage. Screenshots retained in temp for reference.

## Production build

`next build` completes: 19 routes (14 static pages + 5 dynamic API routes: /api/copilot, /api/environment, /api/health, /api/locations, /api/reverse), opengraph image, robots.txt, sitemap.xml generated. TypeScript check passes during build.
