// app.js：跑事件流、算不变量、给页面用的视图（脚手架，照原样用，不用改）
import { shownOf, hiddenOf, insertSorted, refreshTail } from "./ladder.js";
import { submitLimit, submitMarket, cancelOrder } from "./ops.js";

function tagged(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function cloneState(state) {
  const src = state || {};
  const pairs = function (list) { return (list || []).map(function (row) { return row.slice(); }); };
  return {
    band: (src.band || [1, 1]).slice(),
    seq: src.seq || 0,
    bids: pairs(src.bids),
    asks: pairs(src.asks),
    hidden: pairs(src.hidden),
    trades: pairs(src.trades),
    rejects: pairs(src.rejects),
    cancels: src.cancels || 0,
    cancelled_qty: src.cancelled_qty || 0,
    dropped: pairs(src.dropped),
    dropped_qty: src.dropped_qty || 0,
    traded: src.traded || 0,
    accepted: src.accepted || 0,
    accepted_qty: src.accepted_qty || 0,
    used: (src.used || []).slice()
  };
}

export function applyEvent(state, event) {
  if (!event || typeof event !== "object") { throw tagged("E_BAD_KIND"); }
  if (event.kind === "limit") {
    return submitLimit(state, event.id, event.side, event.price, event.qty, event.display);
  }
  if (event.kind === "market") { return submitMarket(state, event.id, event.side, event.qty); }
  if (event.kind === "cancel") { return cancelOrder(state, event.id); }
  throw tagged("E_BAD_KIND");
}

export function runEvents(state, events) {
  let now = cloneState(state);
  const failed = [];
  for (const event of events || []) {
    try {
      now = applyEvent(now, event);
    } catch (error) {
      const code = error && error.code ? error.code : "E_BAD_KIND";
      const mark = event && typeof event.id === "number" ? event.id : 0;
      failed.push([mark, code]);
      now = cloneState(now);
      now.rejects.push([mark, code]);
    }
  }
  return { state: now, failed: failed };
}

export function fingerprint(state) {
  return JSON.stringify(cloneState(state));
}

function levelsOf(rows) {
  const out = [];
  for (const row of rows) {
    const shown = shownOf(row);
    const last = out.length > 0 ? out[out.length - 1] : null;
    if (last && last[0] === row[1]) { last[1] += shown; } else { out.push([row[1], shown]); }
  }
  return out;
}

function priorityOk(rows, side) {
  for (let at = 1; at < rows.length; at += 1) {
    const prev = rows[at - 1];
    const cur = rows[at];
    if (side === "buy" && prev[1] < cur[1]) { return false; }
    if (side === "sell" && prev[1] > cur[1]) { return false; }
    if (prev[1] === cur[1] && prev[4] > cur[4]) { return false; }
  }
  return true;
}

function noCross(bids, asks) {
  if (bids.length === 0 || asks.length === 0) { return true; }
  return bids[0][1] < asks[0][1];
}

function displayOkSide(rows, state) {
  for (let at = 0; at < rows.length; at += 1) {
    const row = rows[at];
    const hidden = hiddenOf(row);
    let recorded = 0;
    for (const pair of state.hidden) { if (pair[0] === row[0]) { recorded = pair[1]; } }
    if (hidden !== recorded || hidden < 0) { return false; }
    if (hidden > 0) {
      if (row[3] === 0 || shownOf(row) !== row[3]) { return false; }
      for (let other = at + 1; other < rows.length; other += 1) {
        if (rows[other][1] === row[1] && rows[other][2] > 0) { return false; }
      }
    }
  }
  return true;
}

export function render(spec) {
  const events = Array.isArray(spec.events) ? spec.events : [];
  const run = runEvents(spec.state, events);
  const state = run.state;
  const half = Math.ceil(events.length / 2);
  const once = runEvents(spec.state, events);
  const left = runEvents(spec.state, events.slice(0, half));
  const right = runEvents(left.state, events.slice(half));
  const replay = runEvents(spec.state, events);
  const rows = state.bids.concat(state.asks);
  let rest = 0;
  for (const row of rows) { rest += row[2]; }
  return {
    bids: state.bids.map(function (row) { return row.slice(); }),
    asks: state.asks.map(function (row) { return row.slice(); }),
    bid_levels: levelsOf(state.bids),
    ask_levels: levelsOf(state.asks),
    hidden_book: state.hidden.map(function (pair) { return pair.slice(); }),
    trades: state.trades.map(function (row) { return row.slice(); }),
    traded_qty: state.traded,
    trade_count: state.trades.length,
    rejects: state.rejects.map(function (row) { return row.slice(); }),
    reject_count: state.rejects.length,
    cancels: state.cancels,
    cancelled_qty: state.cancelled_qty,
    dropped: state.dropped.map(function (row) { return row.slice(); }),
    dropped_qty: state.dropped_qty,
    accepted: state.accepted,
    accepted_qty: state.accepted_qty,
    rest_qty: rest,
    event_count: events.length,
    failed_events: run.failed.length,
    no_cross: noCross(state.bids, state.asks),
    priority_ok: priorityOk(state.bids, "buy") && priorityOk(state.asks, "sell"),
    conservation_ok: 2 * state.traded + rest + state.cancelled_qty + state.dropped_qty === state.accepted_qty,
    display_ok: displayOkSide(state.bids, state) && displayOkSide(state.asks, state),
    trade_price_ok: state.trades.every(function (row) {
      return row[2] >= state.band[0] && row[2] <= state.band[1];
    }),
    replay_new: fingerprint(replay.state) === fingerprint(state) ? 0 : 1,
    replay_failed: replay.failed.length,
    mid_differs: fingerprint(left.state) !== fingerprint(state),
    split_equal: fingerprint(right.state) === fingerprint(once.state),
    tail: shownOf([9, 100, 5, 2, 1]) + hiddenOf([9, 100, 5, 2, 1])
      + insertSorted([], [9, 100, 5, 0, 1], "buy").length
      + refreshTail([], [9, 100, 5, 0, 1], "sell").length
  };
}
