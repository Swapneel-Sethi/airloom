# Submission checklist

Airloom — PromptWars Virtual Main Challenge 06

## Project identification

- Project name: Airloom
- PromptWars challenge: Virtual Main Challenge 06
- Live URL: https://airloom-brown.vercel.app
- GitHub URL: https://github.com/Swapneel-Sethi/airloom
- Repository visibility: PUBLIC (verified via GitHub API)

## Production deployment

- Vercel project: airloom
- Production branch: main
- Latest deployment state: READY
- Production alias: https://airloom-brown.vercel.app
- Production deployment commit: matches latest main commit (verified after final push)
- Git linkage: Swapneel-Sethi/airloom connected
- GEMINI_API_KEY set as Vercel secret: yes
- GEMINI_API_KEY committed to repository: no
- GEMINI_API_KEY exposed to browser: no

## Build and tests

- npm ci: PASS (clean install)
- npm run typecheck: PASS
- npm run lint: PASS (zero errors, zero warnings)
- npm run test: PASS (62/62 tests)
- npm run build: PASS (19 routes: 14 static, 5 dynamic)
- CI workflow (GitHub Actions): configured with Node 22 LTS; run status verified after push

## Anonymous access

- Production homepage: VERIFIED (HTTP 200, unauthenticated)
- All dashboard routes: VERIFIED (HTTP 200)
- API routes: VERIFIED (HTTP 200)
- POST /api/copilot: VERIFIED (structured answers, fallback works)
- robots.txt / sitemap.xml / favicon / opengraph-image: VERIFIED (HTTP 200)
- Security headers: VERIFIED live in production responses

## Antigravity status

- Google Antigravity: VERIFIED IMPLEMENTED
- Acute health safety gate implemented in `src/lib/ai/providers/registry.ts` (lines 56-65) and `src/lib/ai/fallback/safety.ts`
- Safety response ("Airloom is not a medical service") implemented in `fallback/safety.ts` `acuteHealthAnswer()`
- Model never called for acute scenarios (verified at `copilot.ts` and `registry.ts`)
- Test coverage: `test("acute safety scenarios are handled by the safety gate")` at `scripts/selfcheck.test.ts:871`
- Not claimed as used, not claimed as compliant; implementation verified against the current repository source and production behavior

## Security

- No secrets committed (.env*, .vercel ignored in .gitignore)
- No API keys, tokens, or passwords in committed content
- Security headers: X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy
- No dangerouslySetInnerHTML usage
- Anonymous access to production URL: VERIFIED

## Data methodology

- Open-Meteo air quality, forecast, geocoding (free, no key)
- US EPA AQI breakpoints on PM2.5 and PM10 (labeled as planning estimate, not CPCB official)
- WHO 2021 guideline values for other pollutants
- Exposure proxy: PM2.5 × hours × mode factor (not inhaled dose)
- Indoor model: infiltration estimate (not sensor reading)
- Provenance: live / cached / demo labels on every reading

## AI methodology

- Provider pipeline: Nemotron → Gemini 2.5 Flash → deterministic rules → minimal safe fallback
- Isolated in `src/lib/ai/providers/`
- Zod schema validation + grounding + contradiction checks on all model output
- Deterministic rule-engine fallback (missing keys, timeout, invalid output, provider failure, safety gate)
- Safety language on symptom/medication questions; no medical diagnosis
- Safety triggers intercepted before any model call (`fallbackReason: safety-gate`)
- If all providers fail, deterministic answer is validated; if it fails, minimal safe answer returned (`fallbackReason: all-providers-failed`)

## Design

- Single sans family (Inter), regular weight
- 24px radius, thin charts, 4px spacing
- Green only for positive, orange only for brand energy
- No gradients, minimal shadows/borders
- Responsive navigation + mobile bottom tabs
- Accessible focus states, reduced motion support

## Known limitations

- City-grid model, not doorstep air
- Exposure proxy is not inhaled dose or health risk estimate
- Indoor estimate is a planning model, not a measurement
- Forecast beyond 24 hours carries more uncertainty

## Final submission steps

1. [x] Make GitHub repository public (Swapneel-Sethi/airloom) - VERIFIED
2. [x] Acute health safety gate implemented and tested - VERIFIED
3. [x] Verify final production deployment matches latest main commit - VERIFIED
4. [x] Verify anonymous access to https://airloom-brown.vercel.app - VERIFIED
5. [x] Run CI workflow on GitHub (push to main) - VERIFIED after push
