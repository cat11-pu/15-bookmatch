import assert from "node:assert";
import { shownOf, hiddenOf, insertSorted, refreshTail } from "../ladder.js";
import { submitLimit, submitMarket, cancelOrder } from "../ops.js";
import { render } from "../app.js";

const base = {
  band: [90, 110], seq: 0, bids: [], asks: [], hidden: [], trades: [], rejects: [],
  cancels: 0, cancelled_qty: 0, dropped: [], dropped_qty: 0, traded: 0, accepted: 0,
  accepted_qty: 0, used: []
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("shownOf gives a number", () => {
  assert.strictEqual(typeof shownOf([1, 100, 5, 2, 1]), "number");
});

check("hiddenOf gives a number", () => {
  assert.strictEqual(typeof hiddenOf([1, 100, 5, 2, 1]), "number");
});

check("insertSorted gives a list", () => {
  assert.ok(Array.isArray(insertSorted([], [1, 100, 2, 0, 1], "buy")));
});

check("refreshTail gives a list", () => {
  assert.ok(Array.isArray(refreshTail([], [1, 100, 2, 0, 1], "sell")));
});

check("submitLimit gives a state", () => {
  assert.ok(Array.isArray(submitLimit(base, 1, "buy", 100, 1, 0).bids));
});

check("submitMarket gives a state", () => {
  assert.ok(Array.isArray(submitMarket(base, 2, "sell", 1).asks));
});

check("cancelOrder gives a state", () => {
  const held = submitLimit(base, 1, "buy", 100, 1, 0);
  assert.ok(Array.isArray(cancelOrder(held, 1).bids));
});

check("render counts events", () => {
  const view = render({ state: base, events: [{ kind: "limit", id: 1, side: "buy", price: 100, qty: 1 }] });
  assert.strictEqual(typeof view.event_count, "number");
});

console.log("8 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
