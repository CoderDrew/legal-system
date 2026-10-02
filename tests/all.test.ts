import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import "./current-state-ground-truth.test";
import "./evidence-processing.test";
import "./operational-events.test";

test("the test entrypoint includes every test file", () => {
  const testFiles = readdirSync(import.meta.dirname)
    .filter((file) => file.endsWith(".test.ts") && file !== "all.test.ts")
    .sort();

  assert.deepEqual(testFiles, [
    "current-state-ground-truth.test.ts",
    "evidence-processing.test.ts",
    "operational-events.test.ts",
  ]);
});
