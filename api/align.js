/* 美金匯率對時端點：GET /api/align → {usd_twd, source, as_of}；?usd=100 順手折算。
   源：open.er-api.com（每日更新）；3 秒逾時→降級固定基準 32.5（報價不擋單）。 */
let cache = { at: 0, rate: 0 };
async function usdTwd() {
  if (Date.now() - cache.at < 6 * 3600e3 && cache.rate) return { rate: cache.rate, live: true };
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(3000) });
    const j = await r.json(); const t = j && j.rates && j.rates.TWD;
    if (t > 10 && t < 60) { cache = { at: Date.now(), rate: t }; return { rate: t, live: true, as_of: j.time_last_update_utc }; }
  } catch {}
  return { rate: cache.rate || 32.5, live: false };
}
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Cache-Control', 'public, max-age=21600');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const { rate, live, as_of } = await usdTwd();
  const q = new URL(req.url, 'http://x').searchParams; const usd = Number(q.get('usd') || 0);
  return res.status(200).json({ ok: true, usd_twd: +rate.toFixed(3), live, as_of: as_of || '(cache/fallback)', twd: usd ? +(usd * rate).toFixed(0) : undefined, note: '每日對時；降級基準 32.5' });
};
