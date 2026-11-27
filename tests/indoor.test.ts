import test from "node:test";
import assert from "node:assert/strict";
import { buildIndoorOutlook, infiltrationFactor } from "../src/lib/indoor";
import { buildDemoEnvironment } from "../src/lib/demo";
import { DEFAULT_PROFILE } from "../src/lib/profile";

const delhi = buildDemoEnvironment("delhi");

test("indoor estimate is lower than outdoor with a purifier selected", () => {
  const purifier = infiltrationFactor(DEFAULT_PROFILE);
  const naturalOnly = infiltrationFactor({
    ...DEFAULT_PROFILE,
    ventilation: ["natural"],
  });
  assert.ok(purifier < naturalOnly);

  const indoor = buildIndoorOutlook(delhi, DEFAULT_PROFILE);
  assert.equal(indoor.available, true);
  assert.ok(indoor.outdoorPm25 !== null);
  assert.ok(indoor.estimatedPm25 !== null);
  assert.ok(indoor.estimatedPm25 < indoor.outdoorPm25);
  assert.ok(indoor.rooms.length >= 2);
  if (indoor.ventilationWindow) {
    assert.ok(indoor.ventilationWindow.avgPm25 < 30);
  }
});