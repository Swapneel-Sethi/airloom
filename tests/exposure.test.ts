import test from "node:test";
import assert from "node:assert/strict";
import { exposureProxy, proxyDelta } from "../src/lib/exposure";

test("exposure proxy multiplies concentration, hours, and mode factor", () => {
  assert.equal(exposureProxy(100, 2, 0.5), 100);
  assert.equal(proxyDelta(100, 60), -40);
  assert.equal(proxyDelta(0, 60), null);
});