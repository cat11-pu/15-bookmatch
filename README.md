# bookmatch

盘口撮合台（原生 ES 模块，零依赖）：上方按档位画阶梯图，下方是成交明细，右侧下单与撤单。买卖两侧都按价格时间优先维护，限价单受涨跌区间约束，冰山单只露显示量。app.js、check_sample.js、tests、index.html 是脚手架，要补的是 ladder.js 与 ops.js。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ 即可下单。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js
