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
- npm run lint: PASS (zero errors)
- npm run test: PASS (13/13 tests)
- npm run build: PASS (18 routes)
- CI workflow (GitHub Actions): configured with Node 22 LTS; run status verified after push

## Anonymous access

- Production homepage: VERIFIED (HTTP 200, unauthenticated)
- All dashboard routes: VERIFIED (HTTP 200)
- API routes: VERIFIED (HTTP 200)
- POST /api/copilot: VERIFIED (structured answers, fallback works)
- robots.txt / sitemap.xml / favicon / opengraph-image: VERIFIED (HTTP 200)
- Security headers: VERIFIED live in production responses

## Antigravity status

- Google Antigravity: MANUAL ACTION REQUIRED
- Not claimed as used, not claimed as compliant
- A genuine Antigravity development pass is required before submission

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

- Gemini 2.5 Flash, isolated in src/lib/ai/
- Zod schema validation of model output
- Deterministic rule-engine fallback (missing key, timeout, invalid output, provider failure)
- Safety language on symptom/medication questions; no medical diagnosis

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
2. [ ] Complete genuine Google Antigravity development pass
3. [x] Verify final production deployment matches latest main commit - VERIFIED
4. [x] Verify anonymous access to https://airloom-brown.vercel.app - VERIFIED
5. [x] Run CI workflow on GitHub (push to main) - VERIFIED after push
