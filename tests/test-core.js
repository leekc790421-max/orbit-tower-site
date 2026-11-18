'use strict';
/* v7.1 驗證：全階定價矩陣（含 LINE_22W / Store）、疊加計價、隱蔽性、三層切換、語感 */
const C = require('../api/_snt-core.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (extra ? '  ' + extra : '')); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  ' + extra : '')); }
};

console.log('\n=== 1. 全階矩陣 @ 物調 1.00（規格書基準價）===');
const expect1 = {
  Personal: 145000, LINE_22W: 220000, Business: 310000,
  Store: 1350000, Professional: 1850000, Enterprise: 2600000, Custom: 58000
};
for (const [k, v] of Object.entries(expect1)) {
  const q = C.calculateDynamicQuote(k, 1.0);
  ok(`${k} = ${v}`, q.price_ex_vat === v, `got ${q.price_ex_vat}`);
}

console.log('\n=== 2. 物調 1.03 校準（規格書明列）===');
const e103 = { LINE_22W: 227000, Business: 319000, Store: 1391000 };
for (const [k, v] of Object.entries(e103)) {
  const q = C.calculateDynamicQuote(k, 1.03);
  ok(`${k}@1.03 = ${v}`, q.price_ex_vat === v, `got ${q.price_ex_vat}`);
}

console.log('\n=== 3. 物調夾制 1.00~1.03 ===');
ok('0.5 → 1.00', C.calculateDynamicQuote('LINE_22W', 0.5).inflation === 1.0);
ok('1.5 → 1.03', C.calculateDynamicQuote('LINE_22W', 1.5).inflation === 1.03);
ok('null → 1.00', C.calculateDynamicQuote('LINE_22W', null).inflation === 1.0);
ok('"abc" → 1.00', C.calculateDynamicQuote('LINE_22W', 'abc').inflation === 1.0);
ok('1.02 保留', C.calculateDynamicQuote('LINE_22W', 1.02).inflation === 1.02);

console.log('\n=== 4. 四捨五入至千元（全 7 方案 × 4 物調）===');
let allThousand = true;
for (const k of Object.keys(C.PRICING_BASE)) {
  for (const inf of [1.0, 1.01, 1.02, 1.03]) {
    const q = C.calculateDynamicQuote(k, inf);
    if (q.price_ex_vat % 1000 !== 0) { allThousand = false; console.log('    not thousand:', k, inf, q.price_ex_vat); }
  }
}
ok('全部 28 組皆為千元整數', allThousand);

console.log('\n=== 5. 35% 毛利鎖定（內部稽核）===');
for (const k of Object.keys(C.PRICING_BASE)) {
  const a = C.auditQuote(k, 1.0);
  ok(`${k} 實得毛利 ≈35%`, Math.abs(a.actual_margin - 0.35) < 0.005, `${(a.actual_margin * 100).toFixed(2)}%`);
}

console.log('\n=== 6. 隱蔽性：公開物件不得含 cost / margin / hours ===');
let leak = false;
for (const k of Object.keys(C.PRICING_BASE)) {
  const s = JSON.stringify(C.publicQuote(k, 1.0));
  if (/cost|margin|gross|hourly/i.test(s)) { leak = true; console.log('    LEAK:', k, s); }
}
ok('全 7 方案 publicQuote 皆無 cost/margin/gross/hourly', !leak);
const dq = JSON.stringify(C.calculateDynamicQuote('LINE_22W', 1.0));
ok('calculateDynamicQuote 無 cost', !/cost/i.test(dq), dq);

console.log('\n=== 7. 疊加計價（quoteStack）===');
const s1 = C.quoteStack('LINE_22W', ['L-04', 'L-05'], 0, 1.0);
ok('22w + L-04 + L-05 有模組明細', s1.modules.length === 2, JSON.stringify(s1.modules.map(m => m.code)));
ok('模組工時 = 72+110 = 182', s1.module_hours === 182, String(s1.module_hours));
ok('總工時 = 170+182 = 352', s1.total_hours === 352, String(s1.total_hours));
ok('售價為千元整數', s1.price_ex_vat % 1000 === 0, String(s1.price_ex_vat));
ok('疊加後 > 22w 基準', s1.price_ex_vat > 220000, String(s1.price_ex_vat));
ok('疊加物件無 cost', !/cost|margin|gross|hourly/i.test(JSON.stringify(s1)), JSON.stringify(s1).slice(0, 200));

const s2 = C.quoteStack('Personal', ['L-01', 'L-02', 'L-03'], 0, 1.0);
ok('Personal + L-01~L-03 三模組', s2.modules.length === 3);
ok('L-01~L-03 工時 = 96+120+48 = 264', s2.module_hours === 264, String(s2.module_hours));

const s3 = C.quoteStack('Business', [], 40, 1.0);
ok('Business + 40 額外工時', s3.extra_hours === 40 && s3.total_hours === 280, String(s3.total_hours));
ok('額外工時使售價上升', s3.price_ex_vat > 310000, String(s3.price_ex_vat));

const s4 = C.quoteStack('Store', ['L-04'], 0, 1.03);
ok('Store + L-04 @1.03 千元整數', s4.price_ex_vat % 1000 === 0, String(s4.price_ex_vat));
ok('Store 疊加 > 1,391,000', s4.price_ex_vat > 1391000, String(s4.price_ex_vat));

const s5 = C.quoteStack('LINE_22W', ['L-01', 'L-02', 'L-03', 'L-04', 'L-05', 'AI-001', 'CRM-001', 'PAY-001'], 0, 1.0);
ok('無限疊加 8 模組全收', s5.modules.length === 8, String(s5.modules.length));
ok('無限疊加無 cost 外洩', !/cost|margin|gross|hourly/i.test(JSON.stringify(s5)));

console.log('\n=== 8. 未知模組被忽略（不崩）===');
const s6 = C.quoteStack('Business', ['L-99', 'NOPE', 'L-01'], 0, 1.0);
ok('只收合法模組', s6.modules.length === 1 && s6.modules[0].code === 'L-01');

console.log('\n=== 9. 本地規則引擎：LINE 擴編情境 ===');
const r22 = C.runLocalStrategistEngine('我想做 LINE 官方帳號商業擴編，預算 22 萬', { inflation: 1.0 });
ok('22w 情境含「22w 級」', r22.includes('22w 級'), r22.slice(0, 60));
ok('22w 情境含 220,000', r22.includes('220,000'));
ok('22w 情境含 L-01', r22.includes('L-01'));
ok('22w 情境含 L-02', r22.includes('L-02'));
ok('22w 情境含 L-03', r22.includes('L-03'));
ok('22w 情境結尾引導規模/痛點/時程', /產業規模/.test(r22) && /缺客源/.test(r22) && /上線時程/.test(r22));
ok('22w 情境無罐頭腔', !/您好我是機器人|請輸入\s*1/.test(r22));
ok('22w 情境無成本外洩', !r22.includes('143,000') && !r22.includes('35%'));

const rStore = C.runLocalStrategistEngine('我需要多店聯運、線上交易、無限擴充子帳號', { inflation: 1.0 });
ok('Store 情境含「Store 旗艦」', rStore.includes('Store 旗艦'));
ok('Store 情境含 1,350,000', rStore.includes('1,350,000'));
ok('Store 情境含 LIFF', rStore.includes('LIFF'));
ok('Store 情境含 SaaS 試用建議', rStore.includes('14 天'));
ok('Store 情境無成本外洩', !rStore.includes('877,500'));

const rStore103 = C.runLocalStrategistEngine('我要多店聯運旗艦版', { inflation: 1.03 });
ok('Store@1.03 含 1,391,000', rStore103.includes('1,391,000'), rStore103.match(/NT\$[\d,]+/)?.[0]);

console.log('\n=== 10. 本地規則引擎：其他情境仍正常 ===');
const cases = [
  ['你們的系統報價多少錢', '動態核價試算'],
  ['木作衣櫃一尺多少錢', '木作行情'],
  ['我想租網域分租懶人包', '架網懶人包'],
  ['我是統包商想談派單合作', '數位生態系'],
  ['我家新成屋想做裝修', '光曜星樞總部'],
  ['VIP 黑卡算力怎麼申請', 'CosmoSphere'],
  ['你好', '光曜星樞 SNT 總部']
];
for (const [msg, must] of cases) {
  const r = C.runLocalStrategistEngine(msg, { inflation: 1.0 });
  ok(`「${msg.slice(0, 10)}」含「${must}」`, r.includes(must));
  ok(`「${msg.slice(0, 10)}」無罐頭腔`, !/您好我是機器人|請輸入\s*1/.test(r));
}

console.log('\n=== 11. 報價情境含 22w 與 Store ===');
const rp = C.runLocalStrategistEngine('報價多少', { inflation: 1.0 });
ok('含 22w 級 220,000', rp.includes('220,000'));
ok('含 Store 1,350,000', rp.includes('1,350,000'));
ok('含 SaaS 7,800', rp.includes('7,800'));
ok('無成本外洩', !rp.includes('143,000') && !rp.includes('877,500') && !rp.includes('35%'));

console.log('\n=== 12. systemPrompt 含全階與分層推薦規則 ===');
const sp = C.buildSystemPrompt({ inflation: 1.0, site: 'hq' });
ok('含 22w 級 220,000', sp.includes('220,000'));
ok('含 Store 1,350,000', sp.includes('1,350,000'));
ok('含 L-01~L-05', sp.includes('L-01') && sp.includes('L-05'));
ok('含分層推薦規則', sp.includes('分層推薦規則'));
ok('含禁止制式客服腔', sp.includes('您好我是機器人'));
ok('含結尾引導要求', sp.includes('產業規模'));
ok('不含實際成本', !sp.includes('143,000') && !sp.includes('877,500'));

console.log('\n=== 13. 三層切換：無金鑰 → local_strategist ===');
(async () => {
  delete process.env.LLM_API_KEY;
  delete process.env.ZAI_API_KEY;
  delete process.env.Z_AI_API_KEY;
  const r = await C.generateSmartResponse([{ role: 'user', content: 'LINE 擴編 22 萬方案' }], { inflation: 1.0 });
  ok('engine = local_strategist', r.engine === 'local_strategist', r.engine);
  ok('回覆含 22w', r.reply.includes('22w'));
  ok('attempts 記錄 l1 no_key', r.attempts.some(a => a.p === 'l1' && a.skipped === 'no_key'));
  ok('attempts 記錄 l2 no_key', r.attempts.some(a => a.p === 'l2' && a.skipped === 'no_key'));

  console.log('\n=== 14. 三層切換：假金鑰 → 仍落 local_strategist（不拋錯）===');
  process.env.LLM_API_KEY = 'sk-fake-invalid-key-for-test';
  process.env.LLM_BASE_URL = 'https://api.groq.com/openai/v1';
  process.env.ZAI_API_KEY = 'fake-zai-key';
  const t0 = Date.now();
  const r2 = await C.generateSmartResponse([{ role: 'user', content: '我要多店聯運旗艦版' }], { inflation: 1.0 });
  const ms = Date.now() - t0;
  ok('engine = local_strategist', r2.engine === 'local_strategist', r2.engine);
  ok('回覆含 Store 旗艦', r2.reply.includes('Store 旗艦'));
  ok('attempts 有 l1 錯誤', r2.attempts.some(a => a.p === 'l1' && a.error));
  ok('attempts 有 l2 錯誤', r2.attempts.some(a => a.p === 'l2' && a.error));
  ok('總耗時 < 15s（未卡死）', ms < 15000, `${ms}ms`);

  console.log('\n=== 15. 異常輸入不崩 ===');
  const r3 = await C.generateSmartResponse([], {});
  ok('空陣列仍回覆', r3.reply.length > 10, r3.engine);
  const r4 = await C.generateSmartResponse(null, null);
  ok('null 仍回覆', r4.reply.length > 10, r4.engine);
  ok('undefined 訊息仍回覆', C.runLocalStrategistEngine(undefined, {}).length > 10);
  ok('null context 不崩', C.runLocalStrategistEngine('報價', null).length > 10);
  ok('quoteStack null 模組不崩', C.quoteStack('Business', null, null, null).price_ex_vat > 0);

  console.log('\n=== 16. providerStatus ===');
  const st = C.providerStatus();
  ok('有 l1/l2/l3 欄位', 'l1_gateway' in st && 'l2_zai' in st && 'l3_local' in st);
  console.log('  status:', JSON.stringify(st));

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
  process.exit(fail ? 1 : 0);
})();
