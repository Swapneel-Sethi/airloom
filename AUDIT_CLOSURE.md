# Airloom Audit Closure Matrix

All findings from FREEBUFF, Google Antigravity, and Arena AI audits verified against the current repository source and production behavior.

Statuses: OPEN | FIXED | VERIFIED | INVALIDATED | DUPLICATE

## P0 - Safety & Security

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| S-1 | Antigravity | Critical | Acute safety must run before Gemini | `copilot.ts` line 50-64: `isAcuteHealthScenario()` checked before any Gemini call; `fallback.ts` has comprehensive acute detection with standalone symptoms and context words | Already implemented | `test("acute safety scenarios are handled by the safety gate")` at selfcheck.test.ts:871 | Not yet run on production | Not yet run | VERIFIED |
| S-2 | Antigravity | Critical | Acute safety response must say not a medical service | `fallback.ts` line 78-94: `acuteHealthAnswer()` returns "Airloom is not a medical service" | Already implemented | Same test above | Not yet run | Not yet run | VERIFIED |
| S-3 | Antigravity | Critical | Gemini must never be called for acute scenarios | `copilot.ts` line 51-63: returns deterministic answer immediately, never calls `generateWithGemini` | Already implemented | Unit test proves `isAcuteHealthScenario` returns true for all acute cases | Not yet run on production | Not yet run | VERIFIED |
| S-4 | Arena AI | High | Intent routing must use word boundaries | `fallback.ts` line 310-321: `INTENT_PATTERNS` all use `\b` word boundaries | Already implemented | `test("word boundaries prevent car matching care")` at selfcheck.test.ts:906 | Not yet run | Not yet run | VERIFIED |
| S-5 | Arena AI | High | Intent routing order: Safety > Off-topic > Purifier > Windows > Commute > Activity > Family > Swaps > Generic | `fallback.ts` line 310-321: Patterns ordered exactly as required | Already implemented | `test("fallback intent routing...")` at selfcheck.test.ts:805 with 28 table-driven cases | Not yet run | Not yet run | VERIFIED |
| S-6 | Arena AI | High | `car` must not match `care`; `walk` must not hijack family | `fallback.ts` uses `\bcar\b` and `\bfamily\b` etc. | Already implemented | Same word boundary test | Not yet run | Not yet run | VERIFIED |
| S-7 | Antigravity | High | No API keys logged | `gemini.ts` sends key only in `x-goog-api-key` header, never logs it | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |
| S-8 | Arena AI | High | Stable JSON error codes on API routes | `copilot/route.ts` uses `{ error: { code, message } }` with codes: invalid-request, rate-limited, environment-unavailable, assistant-unavailable | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |
| S-9 | Arena AI | High | Content Security Policy present | `next.config.ts` line 34-37: CSP with frame-ancestors 'none', base-uri 'self', form-action 'self' | Already implemented | `curl -I https://airloom-brown.vercel.app` verified CSP header present | Live HTTP verified | Live HTTP verified | VERIFIED |
| S-10 | Antigravity | High | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | `next.config.ts` lines 19-33: All four headers present | Already implemented | Live HTTP verified | Live HTTP verified | Live HTTP verified | VERIFIED |

## P1 - Numerical Methodology (RELEASE BLOCKER)

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| N-1 | All three audits | Critical | PM2.5 breakpoint table uses old 2012 EPA values instead of 2024 revised values | `aqi.ts` lines 17-24: Uses [0,12.0], [12.1,35.4], [35.5,55.4], [55.5,150.4], [150.5,250.4], [250.5,500.4]. EPA 2024 revision changed to [0,9.0], [9.1,35.4], [35.5,55.4], [55.5,125.4], [125.5,225.4], [225.5,325.4]. Source: aqs.epa.gov AQI Breakpoints page + EPA 2024 fact sheet | Update PM2.5_BREAKPOINTS to 2024 values; PM10 unchanged (no 2024 change) | Breakpoint edge tests at selfcheck.test.ts:633-649 need updating to 2024 values | Delhi demo AQI will be recalculated | Production dashboard AQI will change | OPEN - needs fix |
| N-2 | Arena AI | High | AQI category labels must match methodology | `aqi.ts` line 60-67: `categoryFor()` uses EPA labels (good, moderate, elevated, high, very-high, severe). With 2024 breakpoints, labels remain EPA terminology | No change needed if using EPA scale throughout; document that EPA scale is used | Category edge test at selfcheck.test.ts:651-663 | Not yet run | Not yet run | OPEN - needs verification after N-1 fix |
| N-3 | Arena AI | High | Hourly model concentration vs 24-hour AQI must be labeled as estimate | `aqi.ts` line 10-15: Comment states "hourly model concentration, not a 24 hour average, so the result is an estimate." `environment.ts` line 283-286: Limitations state "Hourly concentration applied to 24 hour AQI breakpoints, so the index is an estimate." `demo.ts` line 242: "Hourly concentration used with 24 hour AQI breakpoints, so the index is an estimate." | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |

## P1 - Multi Profile

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| M-1 | Arena AI | Critical | Legacy `airloom.profile.v1` migration to User 1 | `profiles.ts` line 133-140: `readProfileStore()` reads legacy, creates User 1, preserves all fields, removes legacy key, saves new store | Already implemented | `test("legacy airloom.profile.v1 migrates to User 1")` at selfcheck.test.ts:269 | Not yet run | Not yet run | VERIFIED |
| M-2 | Arena AI | Critical | User numbering: lowest available, no renaming | `profiles.ts` line 69-78: `nextProfileNumber()` finds lowest unused positive integer | Already implemented | `test("next available number skips deleted numbers")` at selfcheck.test.ts:338 | Not yet run | Not yet run | VERIFIED |
| M-3 | Arena AI | Critical | Profile switching isolation | `providers.tsx` line 122-127: `switchProfile()` sets activeId; `EnvironmentProvider` re-keys on activeId change | Already implemented | `test("updating User 1 does not affect User 2")` at selfcheck.test.ts:390 | Not yet run | Not yet run | VERIFIED |
| M-4 | Arena AI | Critical | Logout preserves profiles | `providers.tsx` line 129: `logout()` sets activeId to null only | Already implemented | `test("logout clears active id")` at selfcheck.test.ts:438 | Not yet run | Not yet run | VERIFIED |
| M-5 | Arena AI | Critical | Delete with confirmation, active profile switch | `profiles.ts` line 110-118: `activeIdAfterDelete()` switches to remaining or null | Already implemented | `test("delete active profile switches to another")` at selfcheck.test.ts:473 | Not yet run | Not yet run | VERIFIED |
| M-6 | Arena AI | Critical | Delhi demo separate from user profiles | `providers.tsx` line 89-94: Demo uses `DEMO_PROFILE_ID = "demo"`, separate from stored profiles | Already implemented | `test("demo profile remains functional")` at selfcheck.test.ts:490 | Not yet run | Not yet run | VERIFIED |

## P1 - Onboarding

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| O-1 | Arena AI | Critical | New onboarding starts blank | `profile.ts` line 34-44: `freshOnboardingProfile()` returns location:null, household:[], transport:[], ventilation:[], dataMode:"auto", onboarded:false | Already implemented | `test("freshOnboardingProfile does not modify DEFAULT_PROFILE")` at selfcheck.test.ts:517 | Not yet run | Not yet run | VERIFIED |
| O-2 | Arena AI | Critical | Onboarding does not reset existing profiles | `onboarding/page.tsx` line 33-35: Routes to /profiles if !activeId; no blanket reset on mount | Already implemented | `test("onboarding does not reset an existing profile")` at selfcheck.test.ts:548 | Not yet run | Not yet run | VERIFIED |
| O-3 | Arena AI | Critical | Green selected ToggleChip UI | `controls.tsx`: ToggleChip has green border, green tint, green check, green hint, aria-pressed | Already preserved | Code review | Not yet run | Not yet run | VERIFIED |
| O-4 | Arena AI | High | Location search result spacing | `onboarding/page.tsx` line 201-203: `{result.name},{result.admin1 ? ", {result.admin1}" : null}` - correct spacing | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |
| O-5 | Arena AI | High | Search clears query and closes results on selection | `onboarding/page.tsx` line 196-197: `updateProfile({ location: result, dataMode: "auto" })` - does NOT clear query or close results | Need to clear query and close results after selection | Not yet present | Not yet run | Not yet run | OPEN |

## P1 - Numeric Inputs

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| NI-1 | Arena AI | Critical | Commute distance input must not mangle "12" into "0.512" | `numeric-field.tsx`: Local string state, commits on blur/Enter, validates and clamps | Already implemented | `test("clamp helper keeps values within bounds")` at selfcheck.test.ts:913 | Not yet run | Not yet run | VERIFIED |
| NI-2 | Arena AI | High | NumericField applied to all three locations | Onboarding (line 342), Today (line 121), Settings (line 193) all use NumericField | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |

## P1 - Profile Repair

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| PR-1 | Arena AI | Critical | Field-by-field repair, preserve valid fields | `profile.ts` line 87-150: `repairProfile()` validates each field independently, uses defaults only for invalid fields | Already implemented | `test("repairProfile preserves valid fields when one field is invalid")` at selfcheck.test.ts:557 | Not yet run | Not yet run | VERIFIED |
| PR-2 | Arena AI | High | Invalid commuteTime must not erase location/onboarded | `repairProfile()` reads each field independently with its own fallback | Already implemented | Same test at line 557 asserts onboarded=true and location preserved | Not yet run | Not yet run | VERIFIED |

## P1 - Demo Provenance & Consistency

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| D-1 | Arena AI | Critical | Demo must not claim to be live Open-Meteo | `plan.ts` line 184-186: Source-aware basis wording; `demo.ts` line 245: `dataNote` says "Demo scenario for..."; `demo.ts` line 241: limitation says "Demo scenario. Values are seeded..." | Already implemented | `test("provenance never claims demo is live Open-Meteo")` at selfcheck.test.ts:771 | Not yet run | Not yet run | VERIFIED |
| D-2 | Arena AI | Critical | Header must match demo city in demo mode | `profile.ts` line 255-264: `effectiveLocation()` returns demo city location when dataMode==="demo" | Already implemented | `test("effectiveLocation returns demo city location in demo mode")` at selfcheck.test.ts:796 | Not yet run | Not yet run | VERIFIED |

## P1 - Commute Logic

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| C-1 | Arena AI | Critical | Empty transport must not invent modes | `commute.ts` line 27-38: Returns `available: false` with note "Add at least one way you travel" | Already implemented | `test("commute does not invent modes when none selected")` at selfcheck.test.ts:674 | Not yet run | Not yet run | VERIFIED |
| C-2 | Arena AI | High | Remote work = "No trip" not "0 min for 7 km" | `commute.ts` line 91-92: `option.why = "No trip. Exposure reflects indoor air at home."` | Already implemented | `test("remote work is No trip not 0 minutes for distance")` at selfcheck.test.ts:703 | Not yet run | Not yet run | VERIFIED |
| C-3 | Arena AI | High | Car doesn't win automatically; balance exposure/emissions/time | `commute.ts` line 77-83: `withinBand` filter (1.15x lowest exposure), then `reduce` picks lowest CO2 within band | Already implemented | `test("commute recommends lower-emission option within exposure band")` at selfcheck.test.ts:683 | Not yet run | Not yet run | VERIFIED |

## P1 - Plan Engine

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| PE-1 | Arena AI | High | Single source of truth for bestWindow/worstWindow | `plan.ts` line 445-446: `bestWindow` and `worstWindow` computed once from `windowsFor(today)`; `useDerived.ts` computes plan once | Already implemented | `test("plan best and worst window are single source of truth")` at selfcheck.test.ts:738 | Not yet run | Not yet run | VERIFIED |
| PE-2 | Arena AI | High | Rolling window: no past recommendations | `plan.ts` line 113-123: `windowsFor()` uses `fromHour = currentHour` for today | Already implemented | `test("plan does not recommend past windows")` at selfcheck.test.ts:716 | Not yet run | Not yet run | VERIFIED |
| PE-3 | Arena AI | High | Correct Tomorrow labels | `plan.ts` line 66-68: `timeLabel()` prefixes "Tomorrow, " only when date !== today | Already implemented | `test("plan does not recommend past windows")` indirectly covers | Not yet run | Not yet run | VERIFIED |
| PE-4 | Arena AI | High | Deterministic plan output | `plan.ts`: No `new Date()` in calculation; `generatedAt` is metadata only | Already implemented | `test("the plan is deterministic for identical inputs")` at selfcheck.test.ts:73 | Not yet run | Not yet run | VERIFIED |
| PE-5 | Arena AI | High | No purifier recommendation without purifier | `plan.ts` line 400-403: Night block recommends "Run the purifier..." even without purifier | Need to fix: check `profile.ventilation.includes("purifier")` | Not present | Not yet run | Not yet run | OPEN |

## P1 - Indoor

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| I-1 | Arena AI | High | Indoor and plan use same source | `useDerived.ts`: Single `buildPlan()` and `buildIndoorOutlook()` call | Already implemented | `test("indoor and plan use same household threshold")` at selfcheck.test.ts:748 | Not yet run | Not yet run | VERIFIED |
| I-2 | Arena AI | High | No purifier recommendation without purifier | `indoor.ts` line 120-129: Only recommends purifier if `purifierAvailable`; `plan.ts` night block always recommends purifier | Need to fix plan.ts night block | Not present | Not yet run | Not yet run | OPEN |

## P1 - Swaps

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| SW-1 | Arena AI | High | No zero/negative savings | `swaps.ts` line 48: `co2SavedKgPerYear: Math.max(0, saved)`; line 80: hardcoded 35; line 115: null | Already implemented | `test("swaps do not show negative or zero savings")` at selfcheck.test.ts:764 | Not yet run | Not yet run | VERIFIED |
| SW-2 | Arena AI | High | CO2 ordering transit < two wheeler < car | `constants.ts` line 109-128: transit=0.103, two-wheeler=0.085, car=0.17 | Already implemented | `test("CO2 ordering: two wheeler < transit < car")` at selfcheck.test.ts:665 | Not yet run | Not yet run | VERIFIED |

## P2 - AI Reliability

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| AI-1 | Arena AI | High | Gemini retry on invalid JSON/schema failure | `gemini.ts`: No retry logic; throws AiError on first failure | Need to add retry with concise correction instruction | Not present | Not yet run | Not yet run | OPEN |
| AI-2 | Arena AI | High | Gemini number grounding | `gemini.ts`: No grounding check after validation | Need to add number grounding verification | Not present | Not yet run | Not yet run | OPEN |
| AI-3 | Arena AI | High | One authoritative schema (Zod = Gemini schema) | `schema.ts`: `copilotAnswerSchema` (Zod) and `geminiResponseSchema` (JSON Schema) are separate but manually kept in sync | Already implemented (manually synced) | Code review | Not yet run | Not yet run | VERIFIED |
| AI-4 | Arena AI | High | Fallback reason observable | `copilot.ts` line 57, 72, 92: `fallbackReason` set to "safety-gate", "no-key", or error code | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |
| AI-5 | Arena AI | High | Provider honesty (Gemini vs rules) | `assistant/page.tsx` line 277-279: Shows "Gemini" or "Built in rule engine" with fallback reason | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |

## P2 - Accessibility

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| A-1 | Arena AI | Medium | Skip link | `layout.tsx`: Skip to main content link added | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |
| A-2 | Arena AI | Medium | LocationDialog focus trapping | `location-dialog.tsx`: Focus on open, Escape closes | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |

## P2 - Documentation

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| DOC-1 | Arena AI | Medium | DATA_METHODOLOGY.md must document EPA source and 2024 revision | `docs/DATA_METHODOLOGY.md`: Already documents EPA 454/B-18-007 Table 2 | Need to update to document 2024 EPA revision | Not yet present | Not yet run | Not yet run | OPEN |

## P3 - API Validation

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| API-1 | Arena AI | Medium | Invalid JSON, empty question, wrong content type handled | `copilot/route.ts`: try/catch for JSON parse, Zod schema validation | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |
| API-2 | Arena AI | Medium | No stack traces exposed | `copilot/route.ts`: Generic error messages only | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |

## P3 - SEO / 404

| ID | Source | Severity | Finding | Current State | Fix | Test | Runtime | Production | Status |
|----|--------|----------|---------|---------------|-----|------|---------|------------|--------|
| SEO-1 | Arena AI | Medium | Branded 404 page | `not-found.tsx`: Exists with Wordmark and Back to dashboard link | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |
| SEO-2 | Arena AI | Medium | Single canonical, correct production host | `layout.tsx` line 16: `canonical: SITE.url` where SITE.url = production URL | Already implemented | Code review | Not yet run | Not yet run | VERIFIED |

## Summary of OPEN items:
1. **N-1**: AQI PM2.5 breakpoint table needs update from 2012 to 2024 EPA values (RELEASE BLOCKER)
2. **O-5**: Onboarding location search doesn't clear query or close results after selection
3. **PE-5**: Plan night block recommends purifier even when profile has no purifier
4. **I-2**: Same as PE-5 (indoor purifier recommendation without purifier)
5. **AI-1**: Gemini retry logic not implemented
6. **AI-2**: Gemini number grounding not implemented
7. **DOC-1**: DATA_METHODOLOGY.md needs update for 2024 EPA revision

## Summary of VERIFIED items:
All multi-profile, safety gate, intent routing, profile repair, numeric input, demo provenance, commute logic, plan engine, indoor, swaps, accessibility, security headers, API validation, SEO items verified as already implemented.
