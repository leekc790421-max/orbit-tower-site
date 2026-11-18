'use strict';
/* 幻覺價格攔截器驗證：用 Z.ai 實際編造過的字串當測資 */
const C = require('../api/_snt-core.js');

let pass = 0, fail = 0;
const ok = (n, c, e = '') => { if (c) { pass++; console.log('  PASS  ' + n + (e ? '  ' + e : '')); } else { fail++; console.log('  FAIL  ' + n + (e ? '  ' + e : '')); } };

console.log('\n=== 1. 抽取價格數字 ===');
const t1 = C.extractPriceNumbers('LINE 官方帳號擴編費用約為新台幣3,000-5,000元/月');
ok('抓到 3,000 與 5,000', t1.includes(3000) && t1.includes(5000), JSON.stringify(t1));

const t2 = C.extractPriceNumbers('約數萬至數十萬元');
ok('「數萬」無具體數字 → 不誤判', t2.length === 0, JSON.stringify(t2));

const t3 = C.extractPriceNumbers('22萬級方案，Store 135 萬起');
ok('22萬 → 220000', t3.includes(220000), JSON.stringify(t3));
ok('135萬 → 1350000', t3.includes(1350000), JSON.stringify(t3));

const t4 = C.extractPriceNumbers('NT$220,000 起，含稅 NT$231,000');
ok('NT$ 格式正確', t4.includes(220000) && t4.includes(231000), JSON.stringify(t4));

console.log('\n=== 2. 攔截 Z.ai 實際編造的價格 ===');
const halluc1 = 'LINE官方帳號擴編費用約為新台幣3,000-5,000元/月，根據功能需求而異。';
const g1 = C.guardPrices(halluc1, 1.0);
ok('攔下 3,000-5,000 幻覺價', !g1.ok, JSON.stringify(g1.bad));

const halluc2 = '進階功能(如聊天機器人、CRM整合)約數萬至數十萬元新台幣。';
const g2 = C.guardPrices(halluc2, 1.0);
ok('「數萬至數十萬」無具體數字 → 放行（不誤殺）', g2.ok, JSON.stringify(g2.bad));

const halluc3 = '基本版免費，進階功能約 8,000 元/月。';
const g3 = C.guardPrices(halluc3, 1.0);
ok('攔下 8,000 幻覺價', !g3.ok, JSON.stringify(g3.bad));

console.log('\n=== 3. 核准價格必須放行（不誤殺）===');
const good1 = 'LINE Commercial Growth（22w 級）：NT$220,000 起（未稅），含稅 NT$231,000。';
ok('22w 核准價放行', C.guardPrices(good1, 1.0).ok, JSON.stringify(C.guardPrices(good1, 1.0).bad));

const good2 = 'SaaS 訂閱：Starter NT$7,800/月、Pro NT$13,900/月、Enterprise NT$24,800/月。';
ok('SaaS 三階放行', C.guardPrices(good2, 1.0).ok, JSON.stringify(C.guardPrices(good2, 1.0).bad));

const good3 = '木作衣櫃約 NT$6,200 – 7,500 / 尺起。';
ok('木作行情放行', C.guardPrices(good3, 1.0).ok, JSON.stringify(C.guardPrices(good3, 1.0).bad));

const good4 = 'Store 旗艦版 NT$1,350,000 起。';
ok('Store 放行', C.guardPrices(good4, 1.0).ok, JSON.stringify(C.guardPrices(good4, 1.0).bad));

console.log('\n=== 4. 物調 1.03 時核准清單同步 ===');
const good103 = 'LINE 商業擴編 NT$227,000 起，Store NT$1,391,000 起。';
ok('1.03 核准價放行', C.guardPrices(good103, 1.03).ok, JSON.stringify(C.guardPrices(good103, 1.03).bad));
ok('1.00 時 227,000 被視為未核准', !C.guardPrices(good103, 1.0).ok, JSON.stringify(C.guardPrices(good103, 1.0).bad));

console.log('\n=== 5. 定價意圖偵測 ===');
const intents = [
  ['LINE 官方帳號擴編大概多少錢', true],
  ['你們的報價怎麼算', true],
  ['22w 專案內容', true],
  ['木作衣櫃一尺多少錢', true],
  ['月費多少', true],
  ['我想了解你們的服務', false],
  ['你好', false],
  ['我是統包商想合作', false]
];
for (const [m, exp] of intents) {
  ok(`「${m.slice(0, 14)}」→ ${exp}`, C.isPricingIntent(m) === exp);
}

console.log('\n=== 6. 定價意圖強制走決定性引擎（不呼叫 LLM）===');
(async () => {
  process.env.LLM_API_KEY = 'sk-fake';
  process.env.LLM_BASE_URL = 'https://api.groq.com/openai/v1';
  process.env.ZAI_API_KEY = 'fake';
  const r = await C.generateSmartResponse([{ role: 'user', content: 'LINE 官方帳號擴編大概多少錢' }], { inflation: 1.0 });
  ok('engine = local_strategist', r.engine === 'local_strategist', r.engine);
  ok('未嘗試 L1（pricing_intent）', r.attempts.some(a => a.p === 'l1' && a.skipped === 'pricing_intent'));
  ok('未嘗試 L2（pricing_intent）', r.attempts.some(a => a.p === 'l2' && a.skipped === 'pricing_intent'));
  ok('回覆含核准價 220,000', r.reply.includes('220,000'));
  ok('回覆不含幻覺價 3,000', !r.reply.includes('3,000'));

  console.log('\n=== 7. 非定價問題仍走 LLM 路徑（有嘗試紀錄）===');
  const r2 = await C.generateSmartResponse([{ role: 'user', content: '你好，想了解你們在做什麼' }], { inflation: 1.0 });
  ok('非定價問題有 L1 嘗試', r2.attempts.some(a => a.p === 'l1' && (a.error || a.skipped)));
  ok('最終仍有回覆', r2.reply.length > 10, r2.engine);

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
  process.exit(fail ? 1 : 0);
})();
