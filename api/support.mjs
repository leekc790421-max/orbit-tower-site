/* SNT 雲端辦公室・AI 值班排障端點（懒人包 /snt-support 對接）
   規則劇本先行判斷，無法解決升級 LINE 真人；僅存 KID+域名+訊息於函式日誌（EULA 揭露） */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let body = {};
  try {
    body = req.body && typeof req.body === 'object' && Object.keys(req.body).length ? req.body : JSON.parse((await new Promise((resolve) => { const c = []; req.on('data', (x) => c.push(x)); req.on('end', () => resolve(Buffer.concat(c).toString('utf8'))); })) || '{}');
  } catch { return res.status(400).json({ ok: false, error: 'json required' }); }
  const { kid, domain, msg } = body;
  if (!kid || !domain) return res.status(400).json({ ok: false, error: 'kid & domain required' });

  console.log(JSON.stringify({ svc: 'support', kid, domain, msg: String(msg || '').slice(0, 500), at: new Date().toISOString() }));

  if (msg === '__status__') return res.status(200).json({ ok: true, ai: 'on-duty', plan: 'starter-kit-v1.1' });

  const q = String(msg || '').toLowerCase();
  const R = (answer, escalate) => res.status(200).json({ ok: true, ai: true, answer, escalate: escalate || null });

  if (/404|頁面找不到|找不到頁/.test(q))
    return R('步驟 1：確認 vercel.json/伺服器有開 cleanUrls（/about 要能對應 about/index.html）。步驟 2：檢查連結是否附尾斜線不一致（本套件已統一無尾斜線）。步驟 3：若為子網域，確認 DNS CNAME → cname.vercel-dns.com 已生效。仍 404 請附上網址截圖。');
  if (/ssl|https|憑證|證書/.test(q))
    return R('若用 xingdeng.tw 分租子網域：雲端辦公室會自動派發 SSL，生效約 5–15 分鐘。自有網域請到 Vercel 專案Domains 查看該網域的驗證記錄是否齊全（通常缺一條 CNAME 或 TXT）。');
  if (/表單|聯絡|mailto|收不到/.test(q))
    return R('內建表單探雙軌：1) 提交會存入訪客瀏覽器佇列並嘗試喚起你的信箱用戶端；若要穩定收件請向雲端辦公室申請表單 API 串接（把 form action 換成 /api endpoint 即可）。3) 檢查你的郵件伺服器是否擋下 mailto 寄件。');
  if (/亂碼|語系|font|字體|中文顯示/.test(q))
    return R('請確認 HTML 標記 <meta charset="utf-8"> 存在且伺服器以 charset=utf-8 回應；Nginx 需在 server 區塊加 charset utf-8。字體若遺失請保持 /assets/ 相對路徑完整。');
  if (/信標|授權|kid|activate/.test(q))
    return R(`你的授權碼 ${kid} 已於雲端辦公室登記過（每次開站每日一次自動回報）。可在維修區輸入「查授權」向人工窗口確認。`);
  if (/db|資料|名單|儲存|存到/.test(q))
    return R('套件為純靜態：名單目前存在訪客端佇列＋你設定的 mailto。要後端儲存請向雲端辦公室加購名單 API（含 /ops 同格式查看器）。');

  return R('已記入維修台（編號可引用授權碼 ' + kid.slice(0, 8) + '）。初步建議：先重跑 setup.sh 產出乾淨站點比對，多數部署問題會在此排除。若仍存在，請更具體描述：哪個頁面、什麼操作、預期與現況。', 'https://line.me/R/ti/p/@559julyu');
}
