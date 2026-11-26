# Airloom Hardening Todo

## P0 - Safety
- [x] Acute health safety gate runs BEFORE Gemini in copilot.ts
- [x] Expand acute detection terms
- [x] Refactor intent routing into explicit ordered INTENT_PATTERNS with word boundaries
- [x] Copilot meta fallbackReason includes "safety-gate"
- [x] Gemini NOT called for acute scenarios (tests)

## P0 - Multi profile system (committed b3ee3c5)
- [x] Verify profiles.ts store complete
- [x] Verify legacy migration from airloom.profile.v1
- [x] Verify profile switching, logout, delete
- [x] Verify onboarding no longer resets existing profiles

## P1 - Numeric input bug
- [x] Create reusable NumericField component (local string state, blur/submit validate)
- [x] Apply to onboarding, Today, Settings commute distance
- [x] Regression tests

## P1 - Profile validation & repair
- [x] Field-by-field repair instead of all-or-nothing Zod
- [x] Preserve valid fields on invalid read
- [x] Regression test: invalid commuteTime must not erase location/onboarded

## P1 - Demo provenance & consistency
- [x] Source-aware basis wording: live vs demo
- [x] Header matches demo city when dataMode===demo (effectiveLocation)
- [x] Never claim seeded is live Open-Meteo

## P1 - Commute logic
- [x] Car doesn't win automatically when cleaner alternatives practical
- [x] Remote work = "No trip", not 0 min for 7 km
- [x] Empty transport selection shows "Add at least one way you travel"
- [x] CO2 ordering tests

## P2 - Plan engine consistency
- [x] Single source of truth for bestWindow/worstWindow
- [x] Fix activity threshold contradictions
- [x] Fix "between X to Y" grammar to "from X to Y"
- [x] Fix "1 hourly values" pluralization
- [x] Rolling time window now → next 24 hours (future-only windows)
- [x] No past recommendations / incorrect Tomorrow labels

## P2 - API hardening
- [x] Stable JSON error codes on all API routes
- [x] Validate before rate-limiting (copilot)
- [x] Rate limiting documented as instance-local
- [x] Content type validation (existing)
- [x] Reverse geocoding audit (existing BigDataCloud, server-side only)

## P3 - Accessibility
- [x] Skip link added
- [x] LocationDialog focus trapping (existing)
- [x] aria-live for assistant answers (existing)
- [x] 404 page created

## P3 - Mobile/responsive
- [x] Exposure table min-width + horizontal scroll (existing)
- [x] NumericField mobile-friendly

## P4 - Documentation
- [x] docs/DATA_METHODOLOGY.md already comprehensive and truthful
- [x] docs/DEMO_GUIDE.md truthful (existing)
- [x] No em/en dashes introduced in user-facing docs

## P4 - New tests (56 total, all pass)
- [x] Multi profile migration/switching/deletion/logout/isolation
- [x] Numeric input regression (clamp)
- [x] Per-field profile repair
- [x] Acute safety gate / Gemini never called
- [x] Fallback intent routing table (30+ questions)
- [x] Commute recommendation logic
- [x] CO2 ordering
- [x] AQI breakpoint edges
- [x] Plan time window correctness
- [x] Indoor vs plan consistency
- [x] Swap filtering
- [x] Provenance correctness
- [x] Demo city consistency
- [x] Empty transport behavior

## Remaining
- [ ] Commit and push
- [ ] Verify CI
- [ ] Verify Vercel production
- [ ] Final production QA
