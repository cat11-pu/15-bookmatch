// ops.js：受理、撮合、撤单（基线：一律原样返回状态）
import { shownOf, hiddenOf, insertSorted, refreshTail } from "./ladder.js";

export function submitLimit(state, id, side, price, qty, display) {
  return state;
}

export function submitMarket(state, id, side, qty) {
  return state;
}

export function cancelOrder(state, id) {
  return state;
}
