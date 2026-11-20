// Self-check: `node scripts/check-fsrs-learning-steps.mjs` — rating Good through the learning steps must graduate the card.
import assert from "node:assert/strict";
import { calculateFSRS45 } from "../src/lib/fsrs45.ts";

// Same default the study screen passes for a never-seen card.
const newCard = { interval: 1, reps: 0, lapses: 0, state: "new", dueDate: "2026-11-11", stability: 0, difficulty: 5, lastReview: null, easeFactor: 2.5 };
let now = new Date("2026-11-11T07:00:00Z");
let state = calculateFSRS45("good", newCard, now);
assert.equal(state.state, "learning");
assert.equal(state.learningSteps, 1);

// Round-trip through JSON like the API/localStorage does, then Good again 10 minutes later.
state = JSON.parse(JSON.stringify(state));
now = new Date(now.getTime() + 10 * 60_000);
state = calculateFSRS45("good", state, now);
assert.equal(state.state, "review", "second Good must graduate the card");
assert.ok(state.interval >= 1, `expected a multi-day interval, got ${state.interval}`);

// Again during learning goes back to the first step.
const again = calculateFSRS45("again", { ...calculateFSRS45("good", newCard, now) }, now);
assert.equal(again.state, "learning");
assert.equal(again.learningSteps, 0);
console.log("ok: learning cards graduate after Good on the last step");
