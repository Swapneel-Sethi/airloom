# AI design

Airloom's copilot is a grounded, schema-validated assistant with a deterministic fallback.

## Provider Pipeline

The assistant tries providers in order:

1. **Nemotron** (NVIDIA Nemotron 3.5 Super VL 120B) via `src/lib/ai/providers/nemotron.ts` — NVIDIA Open API (`https://integrate.api.nvidia.com/v1/chat/completions`), JSON schema enforced, temperature 0.35, `max_tokens: 1100`, 9-second timeout.
2. **Gemini 2.5 Flash** via `src/lib/ai/providers/gemini.ts` — Google Generative Language REST API (`generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`), responseSchema enforced, temperature 0.35, `maxOutputTokens: 1100`, `thinkingBudget: 0`, 6-second timeout.
3. **Deterministic rules** via `src/lib/ai/providers/deterministic.ts` — keyword-routed answers for activity, ventilation, commute, indoor, family, swaps, and a general case. Same `CopilotAnswer` shape as model outputs. Answers cite real computed values and never invent data.
4. **Minimal safe fallback** — if all providers fail validation, a verified safe answer is constructed from the best available window.

Fallback reasons (`meta.fallbackReason`): `safety-gate` (acute health question intercepted before any model call), `all-providers-failed` (Nemotron and Gemini both failed or unavailable).

Provider metadata (`meta.provider`): `"nemotron"` | `"gemini"` | `"rules"`. `meta.model` is currently `null` for all providers.

## System instruction

Ten rules:
1. Use only the verified context supplied in the user message. Never invent a number, source, location, forecast, or health claim.
2. Every number cited must appear in the context. Do not calculate new AQI or emission values.
3. Never diagnose, never say a person is safe or protected, never promise a health outcome. Use "may reduce exposure", "consider", "lower exposure option", "based on current data".
4. Prefer concrete times, modes, and actions from the context over general advice.
5. If the context lacks something, say so plainly and offer the closest useful action.
6. Answer in the user's language.
7. Recommendation 1-3 sentences; why and whatToDo hold 2-3 short items; alternative is one realistic option.
8. dataUsed lists the context fields actually used, as short labels.
9. safetyNote is null unless the question mentions symptoms, medication, pregnancy, heart/lung condition, or a child's health; then one calm line that Airloom is not a medical service.
10. Return JSON only, matching the response schema.

## Context

`buildCopilotContext` assembles a verified context object from environment, profile, plan, indoor outlook, and commute comparison: location, local time, data source, freshness, AQI, pollutants (value, unit, times guideline), weather, day averages, best/worst windows, exposure proxies, plan blocks, indoor actions, commute options, profile. Every field the model cites is traceable to a source in the app.

## Validation

Model output is parsed (first `{` to last `}`), then validated against `copilotAnswerSchema` (Zod): recommendation, why (1-4 items), whatToDo (1-4 items), alternative, dataUsed (1-6 items), safetyNote nullable. Invalid output throws `AiError("invalid-output")` and triggers fallback.

## Fallback

`src/lib/ai/fallback.ts` implements `deterministicAnswer`: keyword-routed answers for activity, ventilation, commute, indoor, family, swaps, and a general case. Same `CopilotAnswer` shape as model outputs. Answers cite real computed values (PM2.5, windows, sensitivity threshold, exposure proxy) and never invent data. Safety-trigger detection appends the non-medical boundary line.

The orchestrator (`src/lib/ai/providers/registry.ts`) runs the pipeline: Nemotron → Gemini → deterministic rules → minimal safe fallback. Each provider output is validated (Zod schema + grounding check + contradiction check). On validation failure or error, the next provider is tried. If all providers fail, the deterministic answer is generated and validated; if it also fails validation, a minimal safe answer is returned.

`meta.fallbackReason` values: `safety-gate` (acute health question handled by deterministic rules before any model call), `all-providers-failed` (Nemotron and Gemini both failed validation or were unavailable).

## Orchestration

`src/lib/ai/copilot.ts` `runCopilot`: load environment (demo if no key/location), build plan/indoor/commute/context, invoke `ProviderRegistry.generate` which runs the Nemotron → Gemini → deterministic pipeline, returns validated answer with `meta.provider` (`"nemotron"` | `"gemini"` | `"rules"`), `meta.fallbackReason` (as above), `meta.promptVersion` (`airloom-copilot-v1`), `meta.latencyMs`.

## API

`POST /api/copilot` with `{ question, profile }` (Zod validated, question 2-600 chars). IP in-memory rate limit: 12 requests/minute. Returns answer, meta, and grounding (location, source, freshnessMinutes, AQI, PM2.5, best/worst window, dataSource). Environment failures return 502; rate limit returns 429; validation errors return 400. No raw errors leak.

## When no keys are configured

If neither `NVIDIA_API_KEY` nor `GEMINI_API_KEY` is set, the assistant answers entirely with the rule engine; `meta.provider` is `rules` and `fallbackReason` is `all-providers-failed`. The app is fully functional without model keys.

## Boundaries

Symptom/medication/pregnancy/heart/lung/child questions get the safety note and are never diagnosed. The model cannot produce new measurements; it explains the existing plan and forecast.
