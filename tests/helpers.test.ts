import test from "node:test";
import assert from "node:assert/strict";
import { clamp } from "../src/lib/format";

test("clamp helper keeps values within bounds", () => {
  assert.equal(clamp(0.5, 0.5, 80), 0.5);
  assert.equal(clamp(12, 0.5, 80), 12);
  assert.equal(clamp(100, 0.5, 80), 80);
  assert.equal(clamp(-5, 0.5, 80), 0.5);
});