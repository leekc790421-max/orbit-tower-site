'use strict';
/* v8 驗證：LINE webhook 韌性 — 任何畸形 payload 都必須回 200，絕不 500。
   背景：v7.1 實測 events 為物件時 for...of 拋錯 → FUNCTION_INVOCATION_FAILED 500。 */
const handler = require('../api/webhook.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  ' + extra : '')); }
};

function mkReq(body, url = '/api/webhook?mode=line', method = 'POST') {
  /* 模擬 Node stream：readBody 在 req.body 無鍵時會讀 stream，必須真的 emit end，
     否則 promise 永不 resolve、事件迴圈清空後 node 靜默退出（測試會假性中斷）。 */
  const raw = body === null || body === undefined ? '' : JSON.stringify(body);
  return {
    method, url, headers: {},
    body: body && typeof body === 'object' && Object.keys(body).length ? body : undefined,
    on(evt, cb) {
      if (evt === 'data') { if (raw) cb(Buffer.from(raw)); }
      else if (evt === 'end') { setImmediate(cb); }
    }
  };
}
function mkRes() {
  const r = {
    statusCode: null, payload: null, headersSent: false,
    setHeader() { },
    status(c) { r.statusCode = c; return r; },
    json(o) { r.payload = o; r.headersSent = true; return r; }
  };
  return r;
}
async function call(body, url, method) {
  const res = mkRes();
  await handler(mkReq(body, url, method), res);
  return res;
}

(async () => {
  console.log('\n=== 1. 畸形 events 不得 500（v7.1 真實故障點）===');
  for (const [label, body] of [
    ['events = 物件', { events: { a: 1 } }],
    ['events = 字串', { events: 'abc' }],
    ['events = 數字', { events: 42 }],
    ['events = null', { events: null }],
    ['events = 布林', { events: true }],
    ['無 events 鍵', { destination: 'x' }],
    ['空物件', {}],
    ['events = 空陣列', { events: [] }]
  ]) {
    const r = await call(body);
    ok(`${label} → 200`, r.statusCode === 200, `got ${r.statusCode}`);
    ok(`${label} → ok:true`, r.payload && r.payload.ok === true);
  }

  console.log('\n=== 2. 畸形事件元素不得 500 ===');
  for (const [label, ev] of [
    ['事件為 null', null],
    ['事件為字串', 'x'],
    ['事件為空物件', {}],
    ['message 為 null', { type: 'message', message: null }],
    ['source 缺失', { type: 'message', message: { type: 'text', text: '報價' } }],
    ['text 為數字', { type: 'message', source: { userId: 'U1' }, message: { type: 'text', text: 12345 } }],
    ['未知事件型別', { type: 'unsend', source: { userId: 'U1' } }]
  ]) {
    const r = await call({ events: [ev] });
    ok(`${label} → 200`, r.statusCode === 200, `got ${r.statusCode}`);
  }

  console.log('\n=== 3. 正常事件仍正確處理 ===');
  const r1 = await call({
    events: [{
      type: 'message', replyToken: 'd', source: { type: 'user', userId: 'Utest' },
      message: { type: 'text', id: '1', text: '你們的 LINE 擴編 22w 方案多少錢？' }
    }]
  });
  ok('文字訊息 → 200', r1.statusCode === 200);
  ok('handled = 1', r1.payload && r1.payload.handled === 1, `got ${r1.payload && r1.payload.handled}`);
  const log0 = (r1.payload && r1.payload.log && r1.payload.log[0]) || {};
  ok('intent = price', log0.intent === 'price', `got ${log0.intent}`);
  ok('回覆含 220,000', /220,000/.test(String(log0.text || '')));
  ok('回覆不含幻覺價 3,000', !/3,000/.test(String(log0.text || '')));

  const r2 = await call({ events: [{ type: 'follow', replyToken: 'd', source: { type: 'user', userId: 'U2' } }] });
  ok('follow 事件 → 200', r2.statusCode === 200);
  ok('follow 有歡迎語', !!(r2.payload && r2.payload.log && r2.payload.log[0] && r2.payload.log[0].text));

  console.log('\n=== 4. 其他 HTTP 方法與模式 ===');
  const g = await call(null, '/api/webhook?mode=line', 'GET');
  ok('GET probe → 200', g.statusCode === 200);
  ok('probe 回報 db 狀態', g.payload && 'db' in g.payload);
  const put = await call({}, '/api/webhook?mode=line', 'PUT');
  ok('PUT → 405', put.statusCode === 405, `got ${put.statusCode}`);

  console.log('\n=== 5. oa 分流 ===');
  const lumi = await call({
    events: [{ type: 'message', replyToken: 'd', source: { userId: 'U3' }, message: { type: 'text', text: '你好' } }]
  }, '/api/webhook?mode=line&oa=lumi');
  ok('oa=lumi → 200', lumi.statusCode === 200);
  ok('oa 回報 lumi', lumi.payload && lumi.payload.oa === 'lumi', `got ${lumi.payload && lumi.payload.oa}`);

  console.log('\n=== 6. 非 LINE 模式（Stripe 收口）不得 500 ===');
  const s1 = await call({ type: 'unknown.event' }, '/api/webhook');
  ok('未知 Stripe 事件 → 200', s1.statusCode === 200, `got ${s1.statusCode}`);
  const s2 = await call({ type: 'charge.refunded', data: { object: { id: 'ch_1' } } }, '/api/webhook');
  ok('退款事件 → 200', s2.statusCode === 200, `got ${s2.statusCode}`);

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
  process.exit(fail ? 1 : 0);
})();
