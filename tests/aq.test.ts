import test from "node:test";
import assert from "node:assert/strict";
import { categoryFor, computeAqi, pm25SubIndex } from "../src/lib/aqi";

test("PM2.5 breakpoints follow the US EPA 2024 table", () => {
  // Verified against aqs.epa.gov AQI Breakpoints (2024 revision)
  assert.equal(pm25SubIndex(0), 0);
  assert.equal(pm25SubIndex(9.0), 50);
  assert.equal(pm25SubIndex(9.1), 51);
  assert.equal(pm25SubIndex(35.4), 100);
  assert.equal(pm25SubIndex(35.5), 101);
  assert.equal(pm25SubIndex(55.4), 150);
  assert.equal(pm25SubIndex(55.5), 151);
  assert.equal(pm25SubIndex(125.4), 200);
  assert.equal(pm25SubIndex(125.5), 201);
  assert.equal(pm25SubIndex(225.4), 300);
  assert.equal(pm25SubIndex(225.5), 301);
  assert.equal(pm25SubIndex(325.4), 500);
  assert.equal(pm25SubIndex(9999), 500, "above range clamps to 500");
  assert.equal(pm25SubIndex(-1), null, "negative returns null");
  assert.equal(pm25SubIndex(null), null);
});

test("AQI is null when no pollutant is available and picks the dominant sub index", () => {
  assert.equal(computeAqi(null, null), null);
  const aqi = computeAqi(10, 200);
  assert.ok(aqi);
  assert.equal(aqi.dominant, "pm10");
  assert.ok(aqi.value > 100);
});

test("AQI categories match their boundaries", () => {
  assert.equal(categoryFor(50), "good");
  assert.equal(categoryFor(51), "moderate");
  assert.equal(categoryFor(101), "elevated");
  assert.equal(categoryFor(201), "very-high");
  assert.equal(categoryFor(301), "severe");
});

test("AQI breakpoint edges are handled", () => {
  // Verified against aqs.epa.gov AQI Breakpoints (2024 revision)
  assert.equal(pm25SubIndex(0), 0);
  assert.equal(pm25SubIndex(9.0), 50);
  assert.equal(pm25SubIndex(9.1), 51);
  assert.equal(pm25SubIndex(35.4), 100);
  assert.equal(pm25SubIndex(35.5), 101);
  assert.equal(pm25SubIndex(55.4), 150);
  assert.equal(pm25SubIndex(55.5), 151);
  assert.equal(pm25SubIndex(125.4), 200);
  assert.equal(pm25SubIndex(125.5), 201);
  assert.equal(pm25SubIndex(225.4), 300);
  assert.equal(pm25SubIndex(225.5), 301);
  assert.equal(pm25SubIndex(325.4), 500);
  assert.equal(pm25SubIndex(9999), 500, "above range clamps to 500");
  assert.equal(pm25SubIndex(-1), null, "negative returns null");
  assert.equal(pm25SubIndex(null), null);
});

test("categoryFor covers all category edges", () => {
  assert.equal(categoryFor(50), "good");
  assert.equal(categoryFor(51), "moderate");
  assert.equal(categoryFor(100), "moderate");
  assert.equal(categoryFor(101), "elevated");
  assert.equal(categoryFor(150), "elevated");
  assert.equal(categoryFor(151), "high");
  assert.equal(categoryFor(200), "high");
  assert.equal(categoryFor(201), "very-high");
  assert.equal(categoryFor(300), "very-high");
  assert.equal(categoryFor(301), "severe");
  assert.equal(categoryFor(500), "severe");
});