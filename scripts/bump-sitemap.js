/* build 時自動更新 sitemap lastmod（「這站是活的」訊號）＋ IndexNow 提交。
   → Yandex／Bing／Naver 即時收錄，Google 走 sitemap ping；失敗僅警告，絕不擋 build。
   金鑰檔＝根目錄 32 位 hex 檔名 .txt（內容＝檔名）。 */
const fs = require("fs");

const HOST = "xingdeng.tw";

let s = "";
if (fs.existsSync("sitemap.xml")) {
  s = fs.readFileSync("sitemap.xml", "utf8");
  const today = new Date().toISOString().slice(0, 10);
  s = s.replace(/<lastmod>[^<]*<\/lastmod>/g, "<lastmod>" + today + "</lastmod>");
  fs.writeFileSync("sitemap.xml", s);
  console.log("[bump] sitemap lastmod ->", today);
}

const urls = [...(s.match(/<loc>([^<]+)<\/loc>/g) || [])].map(m => m.slice(5, -6)).filter(u => u.includes("://" + HOST));
if (!urls.length) { console.log("[indexnow] 無 URL 可提交，跳過"); process.exit(0); }

const keyFile = fs.readdirSync(".").find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.log("[indexnow] 找不到金鑰檔（32hex.txt），跳過"); process.exit(0); }
const key = keyFile.slice(0, 32);
const ctl = new AbortController();
const t = setTimeout(() => ctl.abort(), 15000);
fetch("https://api.indexnow.org/indexnow", {
  method: "POST", signal: ctl.signal,
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: "https://" + HOST + "/" + keyFile, urlList: urls.slice(0, 10000) })
}).then(async r => console.log("[indexnow] " + urls.length + " URLs -> HTTP " + r.status + (r.ok ? " ✓" : "（非 2xx，下次 build 重試）")))
  .catch(e => console.log("[indexnow] 失敗（不擋 build）:", String(e && e.message || e).slice(0, 120)))
  .finally(() => clearTimeout(t));
