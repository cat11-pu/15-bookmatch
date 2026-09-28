import fs from "node:fs";
import { render } from "./app.js";
import { submitLimit, submitMarket, cancelOrder } from "./ops.js";

const __lines = [];
function emit(label, value) {
  __lines.push([String(label), value]);
}

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/orders.json", "utf8"));
const view = render(spec);

emit("收尾后买单表", JSON.stringify(view.bids));
emit("收尾后卖单表", JSON.stringify(view.asks));
emit("收尾后买档", JSON.stringify(view.bid_levels));
emit("收尾后卖档", JSON.stringify(view.ask_levels));
emit("收尾后隐藏量账", JSON.stringify(view.hidden_book));
emit("成交记录", JSON.stringify(view.trades));
emit("成交笔数", view.trade_count);
emit("成交量总计", view.traded_qty);
emit("拒单记录", JSON.stringify(view.rejects));
emit("拒单计数", view.reject_count);
emit("撤单计数", view.cancels);
emit("撤销量", view.cancelled_qty);
emit("丢弃记录", JSON.stringify(view.dropped));
emit("丢弃量", view.dropped_qty);
emit("受理单数", view.accepted);
emit("受理总量", view.accepted_qty);
emit("事件总数", view.event_count);
emit("异常事件数", view.failed_events);
emit("收盘无交叉", view.no_cross);
emit("价格时间优先成立", view.priority_ok);
emit("成交量守恒", view.conservation_ok);
emit("显示隐藏一致", view.display_ok);
emit("成交价在区间内", view.trade_price_ok);
emit("重放不新增", view.replay_new);
emit("重放报错条数", view.replay_failed);
emit("拆两轮中间态不同", view.mid_differs);
emit("拆两轮收尾态一致", view.split_equal);
emit("低层函数尾值", view.tail);

// ---- 异常路径探针：真调用实现，看它报出什么码 ----
const fresh = function () { return JSON.parse(JSON.stringify(spec.state)); };

try {
  submitLimit(fresh(), 0, "buy", 100, 1, 0);
  emit("订单号不合法报码", "没有报错");
} catch (error) {
  emit("订单号不合法报码", error && error.code ? error.code : String(error.message));
}

try {
  submitLimit(fresh(), 1, "hold", 100, 1, 0);
  emit("方向不合法报码", "没有报错");
} catch (error) {
  emit("方向不合法报码", error && error.code ? error.code : String(error.message));
}

try {
  submitLimit(fresh(), 1, "buy", 0, 1, 0);
  emit("价格不合法报码", "没有报错");
} catch (error) {
  emit("价格不合法报码", error && error.code ? error.code : String(error.message));
}

try {
  submitLimit(fresh(), 1, "buy", 100, 0, 0);
  emit("数量不合法报码", "没有报错");
} catch (error) {
  emit("数量不合法报码", error && error.code ? error.code : String(error.message));
}

try {
  submitLimit(fresh(), 1, "buy", 100, 2, 3);
  emit("显示量不合法报码", "没有报错");
} catch (error) {
  emit("显示量不合法报码", error && error.code ? error.code : String(error.message));
}

try {
  submitLimit(fresh(), 1, "buy", 106, 1, 0);
  emit("超区间报码", "没有报错");
} catch (error) {
  emit("超区间报码", error && error.code ? error.code : String(error.message));
}

try {
  const held = submitLimit(fresh(), 2, "buy", 99, 1, 0);
  submitLimit(held, 2, "sell", 101, 1, 0);
  emit("订单号重复报码", "没有报错");
} catch (error) {
  emit("订单号重复报码", error && error.code ? error.code : String(error.message));
}

try {
  cancelOrder(fresh(), 5);
  emit("撤单缺失报码", "没有报错");
} catch (error) {
  emit("撤单缺失报码", error && error.code ? error.code : String(error.message));
}

// ---- 期望值（参考模型算出）----
const EXPECTED = {
  "收尾后买单表": [
    [
      208,
      96,
      3,
      0,
      12
    ]
  ],
  "收尾后卖单表": [
    [
      107,
      99,
      2,
      0,
      11
    ],
    [
      108,
      102,
      4,
      2,
      13
    ]
  ],
  "收尾后买档": [
    [
      96,
      3
    ]
  ],
  "收尾后卖档": [
    [
      99,
      2
    ],
    [
      102,
      2
    ]
  ],
  "收尾后隐藏量账": [
    [
      108,
      2
    ]
  ],
  "成交记录": [
    [
      201,
      101,
      100,
      2
    ],
    [
      201,
      102,
      100,
      2
    ],
    [
      301,
      101,
      100,
      2
    ],
    [
      301,
      101,
      100,
      1
    ],
    [
      301,
      103,
      101,
      2
    ],
    [
      104,
      202,
      99,
      2
    ],
    [
      204,
      104,
      98,
      3
    ],
    [
      105,
      205,
      97,
      1
    ],
    [
      105,
      205,
      97,
      1
    ],
    [
      207,
      104,
      98,
      1
    ],
    [
      107,
      207,
      104,
      1
    ]
  ],
  "成交笔数": 11,
  "成交量总计": 18,
  "拒单记录": [
    [
      203,
      "E_LIMIT"
    ],
    [
      205,
      "E_DUP_ID"
    ],
    [
      206,
      "E_BAD_DISPLAY"
    ],
    [
      104,
      "E_NO_ORDER"
    ],
    [
      106,
      "E_LIMIT"
    ]
  ],
  "拒单计数": 5,
  "撤单计数": 2,
  "撤销量": 3,
  "丢弃记录": [
    [
      302,
      9
    ]
  ],
  "丢弃量": 9,
  "受理单数": 15,
  "受理总量": 57,
  "事件总数": 22,
  "异常事件数": 5,
  "收盘无交叉": true,
  "价格时间优先成立": true,
  "成交量守恒": true,
  "显示隐藏一致": true,
  "成交价在区间内": true,
  "重放不新增": 0,
  "重放报错条数": 5,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "低层函数尾值": 7,
  "订单号不合法报码": "E_BAD_ID",
  "方向不合法报码": "E_BAD_SIDE",
  "价格不合法报码": "E_BAD_PRICE",
  "数量不合法报码": "E_BAD_QTY",
  "显示量不合法报码": "E_BAD_DISPLAY",
  "超区间报码": "E_LIMIT",
  "订单号重复报码": "E_DUP_ID",
  "撤单缺失报码": "E_NO_ORDER"
};
function __same(got, want) {
  if (typeof got === "string") {
    try {
      const parsed = JSON.parse(got);
      if (JSON.stringify(parsed) === JSON.stringify(want)) { return true; }
    } catch (error) { /* 不是 JSON 就当普通字符串比 */ }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  if (__same(found[1], want)) { console.log("一致 " + label + " = " + JSON.stringify(found[1])); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(found[1])); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
