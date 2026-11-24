# AI design

Airloom's copilot is a grounded, schema-validated assistant with a deterministic fallback.

## Provider

Gemini 2.5 Flash via the Google Generative Language REST API (`generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`). Configured through `src/lib/ai/gemini.ts`, isolated from the rest of the codebase. Temperature 0.35, `maxOutputTokens 1100`, `responseMimeType: application/json`, `responseSchema` enforced, `thinkingBudget: 0`, 22-second timeout, `cache: no-store`.

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

`src/lib/ai/fallback.ts` implements `deterministicAnswer`: keyword-routed answers for activity, ventilation, commute, indoor, family, swaps, and a general case. Same `CopilotAnswer` shape as Gemini output. Answers cite real computed values (PM2.5, windows, sensitivity threshold, exposure proxy) and never invent data. Safety-trigger detection appends the non-medical boundary line.

## Orchestration

`src/lib/ai/copilot.ts` `runCopilot`: load environment (demo if no key/location), build plan/indoor/commute/context, try Gemini, on any error return deterministic answer with `meta.fallbackReason` set. Meta records provider, model, fallbackReason, promptVersion (`airloom-copilot-v1`), latencyMs.

## API

`POST /api/copilot` with `{ question, profile }` (Zod validated, question 2-600 chars). IP in-memory rate limit: 12 requests/minute. Returns answer, meta, and grounding (location, source, freshnessMinutes, AQI, PM2.5, best/worst window, dataSource). Environment failures return 502; rate limit returns 429; validation errors return 400. No raw errors leak.

## When no key is configured

The assistant answers entirely with the rule engine; `meta.provider` is `rules` and `fallbackReason` is `no-key`. The app is fully functional without Gemini.

## Boundaries

Symptom/medication/pregnancy/heart/lung/child questions get the safety note and are never diagnosed. The model cannot produce new measurements; it explains the existing plan and forecast.
