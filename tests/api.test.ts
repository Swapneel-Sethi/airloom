import test from "node:test";
import assert from "node:assert/strict";
import { copilotAnswerSchema } from "../src/lib/ai/schema";

test("copilot schema rejects malformed model output", () => {
  const valid = copilotAnswerSchema.safeParse({
    recommendation: "Move the run to 17:00.",
    why: ["PM2.5 is lower in that window."],
    whatToDo: ["Run at 17:00."],
    alternative: "Keep the session indoors.",
    dataUsed: ["Hourly PM2.5 forecast"],
    safetyNote: null,
  });
  assert.equal(valid.success, true);

  const missing = copilotAnswerSchema.safeParse({ recommendation: "Only one field." });
  assert.equal(missing.success, false);

  const emptyWhy = copilotAnswerSchema.safeParse({
    recommendation: "Move it.",
    why: [],
    whatToDo: ["Run later."],
    alternative: "Indoors.",
    dataUsed: ["Forecast"],
    safetyNote: null,
  });
  assert.equal(emptyWhy.success, false);
});

test("copilot schema validates all required fields", () => {
  const incomplete = copilotAnswerSchema.safeParse({
    recommendation: "Test",
    why: ["Reason"],
    whatToDo: ["Action"],
    alternative: "Alt",
    dataUsed: ["Data"],
    // safetyNote missing
  });
  assert.equal(incomplete.success, false);
});

test("copilot schema rejects empty arrays for why and whatToDo", () => {
  const emptyWhy = copilotAnswerSchema.safeParse({
    recommendation: "Test",
    why: [],
    whatToDo: ["Action"],
    alternative: "Alt",
    dataUsed: ["Data"],
    safetyNote: null,
  });
  assert.equal(emptyWhy.success, false);

  const emptyWhatToDo = copilotAnswerSchema.safeParse({
    recommendation: "Test",
    why: ["Reason"],
    whatToDo: [],
    alternative: "Alt",
    dataUsed: ["Data"],
    safetyNote: null,
  });
  assert.equal(emptyWhatToDo.success, false);
});

test("copilot schema allows empty dataUsed (has default)", () => {
  const emptyDataUsed = copilotAnswerSchema.safeParse({
    recommendation: "Test",
    why: ["Reason"],
    whatToDo: ["Action"],
    alternative: "Alt",
    dataUsed: [],
    safetyNote: null,
  });
  assert.equal(emptyDataUsed.success, true);
});