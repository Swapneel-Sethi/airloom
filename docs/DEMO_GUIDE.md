# Demo guide

Airloom demo walkthrough for judges and reviewers.

## What loads by default

`/dashboard` opens on a seeded Delhi scenario (winter smog, severe morning peak). The default profile is the judge scenario: Delhi, household adult+child+older-adult, purifier + natural ventilation, two-wheeler + transit transport, 7 km commute at 08:30, running at 06:30. `dataMode: "demo"` so every number is seeded and labelled "Demo scenario". No sign-up, no API key required.

## Five-minute walkthrough

1. **Overview** (`/dashboard`): Delhi AQI 236, very high, PM2.5 dominant. Today's call: "Take public transport for this trip". Lowest window 14:00-16:00, highest 06:00-08:00. Planned exposure proxy 165 µg/m³·h, 43% lower than current routine. Expand "Demo scenario / seeded values" to see provenance.
2. **Today** (`/dashboard/today`): Block by block plan: move the run to 14:00-16:00, take public transport at 08:30, keep midday errands short, keep afternoon indoors, ventilate briefly at 17:00, run purifier at night. Routine builder lets you edit commute time/distance, activity, activity time; changes rebuild the plan immediately.
3. **Exposure** (`/dashboard/exposure`): Hourly PM2.5 chart with WHO 15 guideline line; next-12-hours strip; commute comparison table (walk, cycle, transit, two-wheeler, car, remote) sorted by exposure proxy with recommended mode highlighted.
4. **Indoor** (`/dashboard/indoor`): Outdoor vs estimated occupied-room PM2.5; ventilation window or keep-closed advice; room estimates; indoor actions (purifier in occupied room, check filter).
5. **Swaps** (`/dashboard/swaps`): Impact simulator: current routine vs this plan exposure proxy; swaps (transit two days a week, walk short days, one errand loop, move activity to low window, filter one room) each with effort, frequency, horizon, basis, CO2 estimate.
6. **Assistant** (`/dashboard/assistant`): Ask "Should I go for a run this morning?" or "Should I open my windows?" Answers cite the data used and fall back to the rule engine when no model key is configured.
7. **Settings** (`/dashboard/settings`): Change location (search, use my location, or pick a demo city), toggle household/transport/ventilation, edit routine, reset profile.

## Demo cities

Delhi, Mumbai, Bengaluru, Kolkata, Lucknow. Each has a condition label (e.g. "Winter smog, severe morning peak"). Selectable from onboarding, settings, or the location dialog.

## Live data

Choose any city via search or "use my location" to switch `dataMode` to `auto` and fetch live Open-Meteo model data. Live readings carry a "Live model estimate" provenance label. Without `GEMINI_API_KEY` the assistant uses the built-in rule engine; everything else works identically.

## What to point out

- Provenance label on every reading (live / cached / demo).
- "Why this recommendation" under every plan block and copilot answer.
- Deterministic plan: same inputs, same output, no generative randomness.
- Error and empty states when the provider fails (retry available).
- No em dashes; no fabricated claims; "not a medical service" boundary on symptom questions.
