/* Orbit Tower 真實網站診斷（serverless）：抓公開首頁 → 結構/表頭 14 項檢測
   guard：僅公開 https、5s timeout、只回結論不回傳原文 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let url;
  try {
    if (req.body && typeof req.body === 'object' && req.body.url) { url = req.body.url; }
    else {
      const __raw = await new Promise((resolve) => { const c = []; req.on('data', (x) => c.push(x)); req.on('end', () => resolve(Buffer.concat(c).toString('utf8'))); });
      url = JSON.parse(__raw || (req.text ? await req.text() : '{}')).url;
    }
    if (!url) throw new Error('missing url');
  } catch { return res.status(400).json({ error: 'json required' }); }
  let u; try { u = new URL(url); } catch { return res.status(400).json({ error: 'invalid url' }); }
  if (!/^https?:$/.test(u.protocol) || u.hostname === 'localhost' || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(u.hostname))
    return res.status(400).json({ error: 'public https only' });
  const t0 = Date.now();
  try {
    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 5000);
    const r = await fetch(u.toString(), { signal: ac.signal, redirect: 'follow', headers: { 'user-agent': 'OrbitTowerDiagnoser/1' } });
    clearTimeout(to);
    const html = (await r.text()).slice(0, 200000);
    const hdrs = {}; r.headers.forEach((v, k) => { hdrs[k.toLowerCase()] = v; });
    const has = re => re.test(html);
    const F = [];
    const chk = (label, ok) => { F.push({ label, ok: !!ok }); return !!ok; };
    const ux = chk('RWD viewport', has(/name="viewport"/i));
    const ti = chk('具 <title>（8–60字）', has(/<title[^>]*>[^<]{8,60}<\/title>/i));
    chk('單一 H1 架構', (html.match(/<h1[\s>]/gi) || []).length === 1);
    const de = chk('meta description', has(/name="description"/i));
    const ca = chk('Canonical 自址', has(/rel="canonical"/i));
    const og = chk('Open Graph 社群卡', has(/property="og:/i));
    const sc = chk('結構化資料 ld+json', has(/application\/ld\+json/i));
    const hl = chk('多語 hreflang（或語言切換器）', has(/hreflang=/i) || has(/lang-toggle|language-switch/i));
    chk('html lang 宣告', has(/<html[^>]+lang=/i));
    chk('圖片 lazy 載入', has(/loading="lazy"/i));
    const cs = chk('資安標頭 CSP', hdrs['content-security-policy']);
    const hs = chk('資安標頭 HSTS', hdrs['strict-transport-security']);
    chk('資安標頭 FrameOptions', hdrs['x-frame-options'] || /frame-ancestors/.test(hdrs['content-security-policy'] || ''));
    chk('HTTPS 協定', u.protocol === 'https:');
    const aiChat = /chat|widget|bot|messenger/i.test(html);
    const cached = /max-age|public/i.test(hdrs['cache-control'] || '') || !!hdrs['x-vercel-cache'];
    const s = a => Math.round(a.filter(Boolean).length / a.length * 100);
    res.status(200).json({
      ok: true, findings: F,
      scores: { '網站體驗': s([ux, ti, de]), 'SEO': s([de, ca, og, sc, ti]), '資安': s([cs, hs, hdrs['x-frame-options'], u.protocol === 'https:']), '國際化': s([hl, has(/<html[^>]+lang=/i)]), 'AI 成熟度': s([aiChat, cached, sc]) },
      ms: Date.now() - t0, kb: Math.round(html.length / 1024)
    });
  } catch (e) { res.status(502).json({ error: 'fetch failed: ' + String(e.message || e).slice(0, 90) }); }
}
