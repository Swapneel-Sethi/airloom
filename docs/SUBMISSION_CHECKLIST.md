# Submission checklist

Airloom — PromptWars Virtual Main Challenge 06

## Project identification

- Project name: Airloom
- PromptWars challenge: Virtual Main Challenge 06
- Live URL: https://airloom-brown.vercel.app
- GitHub URL: https://github.com/Swapneel-Sethi/airloom
- Repository visibility: private (manual GitHub action required to make public)

## Production deployment

- Vercel project: airloom
- Production branch: main
- Latest deployment state: READY
- Production alias: https://airloom-brown.vercel.app
- Production commit matches latest main commit: yes (to be verified after final push)
- GEMINI_API_KEY set as Vercel secret: yes
- GEMINI_API_KEY committed to repository: no
- GEMINI_API_KEY exposed to browser: no

## Build and tests

- npm ci: PASS
- npm run typecheck: PASS
- npm run lint: PASS (zero errors)
- npm run test: PASS (13/13 tests)
- npm run build: PASS (18 routes)
- CI workflow (GitHub Actions): present, not yet run on GitHub

## Documentation

- README.md: present, correct URL, correct Antigravity status, license section
- DESIGN.md: present, design system source of truth
- docs/TECHNICAL_WRITEUP.md: present
- docs/CHALLENGE_ALIGNMENT.md: present
- docs/COMPETITIVE_GAP_ANALYSIS.md: present
- docs/AI_DESIGN.md: present
- docs/DATA_METHODOLOGY.md: present
- docs/TESTING.md: present
- docs/DEMO_GUIDE.md: present
- docs/LINKEDIN_BUILD_IN_PUBLIC.md: draft (not published)
- docs/SUBMISSION_CHECKLIST.md: this file
- .env.example: present (no real secrets)

## Antigravity status

- Google Antigravity: MANUAL ACTION REQUIRED
- Not claimed as used, not claimed as compliant
- A genuine Antigravity development pass is required before submission

## Security

- No secrets committed (.env*, .vercel ignored in .gitignore)
- No API keys, tokens, or passwords in committed content
- Security headers: X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy
- No dangerouslySetInnerHTML usage
- Anonymous access to production URL: to be verified after deployment

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

1. [ ] Make GitHub repository public (Swapneel-Sethi/airloom)
2. [ ] Complete genuine Google Antigravity development pass
3. [ ] Verify final production deployment matches latest main commit
4. [ ] Verify anonymous access to https://airloom-brown.vercel.app
5. [ ] Run CI workflow on GitHub (push to main or manual dispatch)
