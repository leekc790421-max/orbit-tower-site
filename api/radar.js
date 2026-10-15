/* SEO・健康雷達機器人（RADAR BOT）— 合法自盯，不抓取他人站點個資
   GET /api/radar              → 最近一次巡檢摘要＋設定
   POST /api/radar {scan:true} → 本站精檢：sitemap→逐頁 title/description/hreflang/JSON-LD/canonical/OG 完整性
   排程：Vercel Cron 每日 06:00 打 /api/radar?tick=1&secret=$CRON_SECRET
   ENV：CRON_SECRET（守門）、GOOGLE_INDEXING 預留（掛上才做索引推送通知，否則純本地報告）。
   ※ 邊界：只爬自有網域 xingdeng.tw；不抓個資、不迴避 robots、不打第三方。 */
const SELF = 'https://xingdeng.tw';
let lastScan = null;
const isSelf = u => { try { return new URL(u).hostname === 'xingdeng.tw'; } catch { return false; } };
async function crawlList() {
  try {
    const r = await fetch(SELF + '/sitemap.xml', { signal: AbortSignal.timeout(15000) });
    const x = await r.text();
    return [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(isSelf).slice(0, 80);
  } catch { return [SELF + '/', SELF + '/kits/', SELF + '/pricing/', SELF + '/checkout/', SELF + '/try/', SELF + '/articles/', SELF + '/demo/']; }
}
async function audit(url) {
  const issues = []; const t0 = Date.now(); let size = 0;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const html = await r.text(); size = Buffer.byteLength(html);
    const pick = re => (html.match(re) || [])[1] || '';
    const title = pick(/<title>([^<]*)<\/title>/i);
    if (!title) issues.push('缺 title'); else if (title.length < 8 || title.length > 60) issues.push(`title 長度 ${title.length}`);
    if (!/<meta name="description" content=".{16,160}?"/i.test(html)) issues.push('description 缺失或過短');
    if (!/<link rel="canonical" href="https:\/\/xingdeng\.tw/i.test(html)) issues.push('canonical 未對準主域');
    if (!/og:title/i.test(html)) issues.push('缺 OG 卡');
    if (url === SELF + '/' && !/application\/ld\+json/i.test(html)) issues.push('首頁缺 JSON-LD');
    const hreflang = [...html.matchAll(/hreflang="(zh-Hant|en|ja|x-default)"/g)].map(m => m[1]);
    if (hreflang.length && new Set(hreflang).size < 4) issues.push('hreflang 四語系矩陣不完整');
    return { url, ms: Date.now() - t0, kb: Math.round(size / 1024), health: issues.length ? issues : ['✓'] };
  } catch (e) { return { url, ms: Date.now() - t0, kb: 0, health: ['抓取失敗：' + String(e.message).slice(0, 60)] }; }
}
async function runScan() {
  const list = await crawlList(); const rows = [];
  for (const u of list) rows.push(await (async () => { try { return await audit(u); } catch { return { url: u, health: ['skip'] }; } })());
  lastScan = { at: new Date().toISOString(), pages: rows.length, failing: rows.filter(r => !(r.health.length === 1 && r.health[0] === '✓')).length, rows };
  return lastScan;
}
module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.searchParams.get('tick') === '1') {
    const secret = process.env.CRON_SECRET;
    if (secret && url.searchParams.get('secret') !== secret) return res.status(401).json({ error: 'bad cron secret' });
    const s = await runScan(); return res.status(200).json({ ok: true, bot: 'radar-v1', cron: true, failing: s.failing, pages: s.pages });
  }
  if (req.method === 'POST') {
    const s = await runScan();
    return res.status(200).json({ ok: true, bot: 'radar-v1', ...s, boundary: '僅本站網域・未抓個資' });
  }
  return res.status(200).json({ ok: true, bot: 'radar-v1', last: lastScan || '尚未巡檢（觸發：POST {} 或等晨間 Cron）', mode: 'self-site-audit（合法雷達）' });
};
