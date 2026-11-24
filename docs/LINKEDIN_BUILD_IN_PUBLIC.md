# Build in public: LinkedIn draft

## Headline

Shipped Airloom for PromptWars Challenge 06: an urban air quality assistant that turns an hourly forecast into a personal plan.

## Body

Most air quality apps stop at a number. Airloom starts with a decision.

On a polluted day a household makes a dozen small calls: whether the run happens, which route to work, when to open the windows, whether the purifier earns its power. A single AQI number answers none of them. Airloom is built for the decision, with the number attached and its limits stated.

## What it does

- Reads hourly PM2.5, PM10, NO2, SO2, O3, CO from the Open-Meteo air quality model.
- Computes US EPA AQI, two-hour low and high windows, an exposure proxy (concentration x hours x mode factor), and an indoor infiltration estimate.
- Renders a personalized six-block daily plan: when to move, when to stay in, how to travel, what to change first.
- Compares commute modes on time, exposure proxy, and estimated CO2 at your departure hour.
- Answers questions with a grounded copilot (Gemini, Zod-validated) that falls back to a deterministic rule engine when the model is unavailable.

## Design

Adapted from the Superpower design language: single sans family at regular weight, 24px radius, thin charts, green only for positive, orange only for brand energy, no gradients, minimal shadows and borders, 4px spacing. Every reading carries a live / cached / demo provenance label; seeded data is never presented as live.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Zod, lucide-react, Gemini 2.5 Flash, Open-Meteo. Hand-rolled SVG charts, no recharts.

## Testing

Unit tests (node:test), typecheck, lint, production build, and rendered visual QA across desktop, tablet, and mobile all pass.

## Links

Repo: https://github.com/Swapneel-Sethi/airloom
Live: https://airloom-brown.vercel.app

## Notes

Airloom provides environmental guidance based on available data and is not a medical service. No em dashes. No fabricated stats, testimonials, or partnerships.
