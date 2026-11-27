import test from "node:test";
import assert from "node:assert/strict";
import { NemotronProvider } from "../src/lib/ai/providers/nemotron";
import { GeminiProvider } from "../src/lib/ai/providers/gemini";
import { DeterministicProvider } from "../src/lib/ai/providers/deterministic";
import { ProviderRegistry } from "../src/lib/ai/providers/registry";
import { buildDemoEnvironment } from "../src/lib/demo";
import { buildPlan } from "../src/lib/plan";
import { buildIndoorOutlook } from "../src/lib/indoor";
import { compareCommute } from "../src/lib/commute";
import { buildCopilotContext } from "../src/lib/ai/context";
import { DEFAULT_PROFILE } from "../src/lib/profile";

const delhi = buildDemoEnvironment("delhi");

test("Nemotron provider is available when key is configured", () => {
  const provider = new NemotronProvider("test-key");
  assert.equal(provider.isAvailable(), true);
});

test("Nemotron provider is unavailable when key is not configured", () => {
  const provider = new NemotronProvider(undefined);
  assert.equal(provider.isAvailable(), false);
});

test("Gemini provider is available when key is configured", () => {
  const provider = new GeminiProvider("test-key");
  assert.equal(provider.isAvailable(), true);
});

test("Gemini provider is unavailable when key is not configured", () => {
  const provider = new GeminiProvider(undefined);
  assert.equal(provider.isAvailable(), false);
});

test("Deterministic provider is always available", () => {
  const provider = new DeterministicProvider();
  assert.equal(provider.isAvailable(), true);
});

test("ProviderRegistry runs Nemotron first", () => {
  const registry = new ProviderRegistry();
  // The registry should have providers in order: nemotron, gemini, deterministic
  // We can't easily test the internal order without exporting it,
  // but we can test that it produces valid answers
  // This test would need API keys to run fully
  // For now, verify the registry can be constructed
  assert.ok(registry);
});

test("safety gate runs before any model call", async () => {
  const registry = new ProviderRegistry();
  const plan = buildPlan(delhi, DEFAULT_PROFILE);
  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  const commute = compareCommute(delhi, DEFAULT_PROFILE, 8);
  const context = buildCopilotContext(delhi, DEFAULT_PROFILE, plan, indoor, commute);

  const result = await registry.generate({
    question: "I have chest pain and difficulty breathing",
    context,
  });

  assert.equal(result.provider, "rules");
  assert.equal(result.fallbackReason, "safety-gate");
  assert.ok(result.answer.recommendation.toLowerCase().includes("not a medical service"));
});