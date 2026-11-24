# Airloom

Breathe smarter through polluted days. Airloom turns an hourly air quality forecast into a personalized daily decision plan rather than presenting only an AQI dashboard. It is decision support for households in polluted cities, helping with practical choices such as whether to exercise outdoors, when to travel, which commute option has lower exposure, when to ventilate, how to manage indoor air, and which lower exposure swaps make sense.

## PromptWars

Airloom is a submission for PromptWars Virtual Main Challenge 06, theme Urban Air Quality Assistant.

## Live

Production: https://airloom-brown.vercel.app

Repository: https://github.com/Swapneel-Sethi/airloom

## Why Airloom

Most air quality tools stop at a number. Airloom starts with a decision. On a polluted day a household makes many small calls: whether the run happens, which route to work, when to open windows, whether the purifier earns its power, what to change next month. A single AQI number answers none of them. Airloom attaches the number to a concrete plan and states its limits.

## What Airloom Does

Airloom reads hourly pollution and weather data, computes exposure planning values, turns those calculations into six daily action blocks, and answers questions through a grounded AI copilot. Every reading carries a provenance label: live, cached, or demo. Seeded demo data is never presented as live data.

Core features:

- Location onboarding with city search and browser based location selection
- Seeded demo cities including Delhi, Mumbai, Bengaluru, Kolkata, and Lucknow
- Delhi judge scenario
- Personalized six block daily plan
- AQI and PM2.5 views
- Exposure planning
- Commute comparison with time, exposure proxy, and estimated CO2 per mode
- Indoor air guidance with infiltration estimates and ventilation windows
- Sustainable swaps with stated basis
- Grounded AI assistant with deterministic rule based fallback
- Provenance labels on every reading
- Error and empty states
- Responsive navigation with mobile bottom tabs
- Hand rolled SVG charts
- Settings for household, transport, ventilation, commute, and activity

## How It Works

Read
Airloom reads hourly pollution and weather information from Open-Meteo for the selected coordinate.

Compute
Airloom computes:

- US EPA AQI values for PM2.5 and PM10
- lower and higher pollution windows
- exposure proxy values using PM2.5 times duration times transport mode factor
- commute comparisons
- indoor infiltration estimates
- sustainable transport comparisons

Plan
Airloom turns those calculations into six daily action blocks: morning, commute, midday, afternoon, evening, and night. Each block has an action, time window, reason, confidence, and stated basis.

Explain
The AI copilot answers questions using the same context shown in the product. It references current product data, exposes the data fields it used, does not invent measurements, and has safety boundaries. It does not diagnose medical conditions.

## Data and Methodology

Data sources:

- Open-Meteo air quality data for hourly PM2.5, PM10, NO2, SO2, O3, CO, and AQI
- Open-Meteo weather forecasts for temperature, humidity, and wind
- Open-Meteo geocoding for city search and reverse geocode

Provenance states:

- Live: Fresh provider data.
- Cached: Previously retrieved data used as a stale fallback.
- Demo: Seeded scenario data for reliable product walkthroughs.

Demo data is never presented as live data.

AQI methodology:
Airloom uses US EPA breakpoints for PM2.5 and PM10. The result is a planning estimate and is not an official CPCB AQI measurement.

Exposure proxy:
The exposure proxy uses PM2.5 times duration times transport mode factor. It is a planning proxy. It is not inhaled dose. It is not a medical risk estimate.

Indoor estimate:
The indoor number is based on an infiltration model using the selected household setup. It is a planning estimate. It is not a sensor measurement.

Forecast uncertainty increases further into the forecast period.

## AI Copilot

Gemini 2.5 Flash is used through a server side copilot route. Responses are validated using Zod. The deterministic rule engine provides fallback behavior when Gemini is unavailable, a provider request fails, a request times out, model output does not pass validation, or Gemini is not configured. The AI uses the same context as the product.

Safety boundaries:

- Airloom is not a medical service
- The assistant does not diagnose medical conditions
- Acute respiratory symptom handling was hardened during the final audit so symptomatic questions do not receive outdoor exposure recommendations

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Zod
- lucide-react
- Gemini 2.5 Flash
- Open-Meteo
- Vercel

Charts are hand rolled SVG with no external charting library.

## Testing and Verification

Local checks:

npm ci: PASS

npm run typecheck: PASS

npm run lint: PASS with 0 errors

npm run test: PASS 13 of 13

npm run build: PASS

Production build: 18 routes

GitHub Actions: PASS

Vercel: Production READY

Anonymous production access: VERIFIED

Production routes: VERIFIED

Canonical metadata: Exactly one canonical tag with the production URL

Security headers: VERIFIED

No committed secrets: VERIFIED

No stale old production URL references: VERIFIED

Antigravity audit:
Google Antigravity was genuinely used for the final production audit. The audit covered user journeys, responsive behavior, console behavior, network behavior, API behavior, product logic, AI behavior, accessibility, performance, source code, and security sanity. It identified three genuine issues: mobile assistant composer overlap, acute respiratory safety behavior in the deterministic fallback, and browser geolocation blocked by Permissions Policy. All three were fixed and reverified. Antigravity did not author the original project; it was used for the final audit only.

## Privacy and Security

User profile information remains in browser local storage. No user profile database is required. The Gemini key remains server side. API credentials are not committed. No API key is exposed to the browser.

Production security headers:

- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- X-Frame-Options: DENY
- Permissions-Policy: geolocation=(self), microphone=(), camera=()

Same origin geolocation is intentionally allowed because Airloom provides a Use my location feature.

## Known Limitations

Air quality is based on modelled data rather than a doorstep sensor. AQI is a planning estimate rather than an official CPCB measurement. Exposure values are planning proxies. Indoor values are model estimates. Forecast uncertainty increases further into the future. The application is decision support and not a medical service.

## Run Locally

```bash
npm install
npm run dev
```

Development server: http://localhost:3000

Additional commands:

```bash
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

## Project Structure

```text
src/app/                    Application routes and API routes
src/components/             Shared UI and dashboard components
src/lib/                    Core product logic and AI logic
scripts/                    Tests
docs/                       Technical and project documentation
```

## License

MIT
