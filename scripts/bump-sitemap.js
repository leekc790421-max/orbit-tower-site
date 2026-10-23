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

  /* 漏頁自動補登：paths.txt 是全站清單的真相來源，但舊行為只刷 lastmod，
     新頁面永遠進不了 sitemap（實測 a04/a05/a06 上線卻未登記）。
     → 每次 build 把 paths.txt 裡缺席的項目補進去；冪等，不動已有條目。 */
  if (fs.existsSync("paths.txt")) {
    /* 根頁歸一：sitemap 舊條目是無斜號的 https://xingdeng.tw，
       而頁面 canonical 寫的是 https://xingdeng.tw/ —— 兩者字串不同會被當成兩頁，
       故先統一成 canonical 形態再比對，避免自家製造重複收錄。 */
    s = s.replace(/<loc>https?:\/\/xingdeng\.tw<\/loc>/g, "<loc>https://" + HOST + "/</loc>");
    const norm = u => u.replace(/\/+$/, "") || "https://" + HOST;
    const have = new Set(
      [...(s.match(/<loc>([^<]+)<\/loc>/g) || [])].map(m => norm(m.slice(5, -6)))
    );
    const missing = fs
      .readFileSync("paths.txt", "utf8")
      .split("\n")
      .map(l => l.trim().replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "") || "/")
      .filter((p, i, a) => a.indexOf(p) === i)
      /* 只補「實體存在且允许收錄」的頁：本地找得到檔、且頁面未宣告 noindex
         （否則會把 /checkout 這類交易頁推進 sitemap，反而製造收錄垃圾） */
      .filter(p => {
        const f = p === "/" ? "index.html" : p.replace(/^\//, "") + "/index.html";
        if (!fs.existsSync(f)) { console.log("[bump] 跳過（無實體檔）:", p); return false; }
        if (/name="robots"[^>]*noindex/i.test(fs.readFileSync(f, "utf8"))) { console.log("[bump] 跳過（noindex）:", p); return false; }
        return true;
      })
      .map(p => "https://" + HOST + p)
      .filter(u => !have.has(norm(u)));   /* 必用 norm 比對：have 存的是歸一化鍵 */
    if (missing.length && /<\/urlset>/.test(s)) {
      const block = missing
        .map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`)
        .join("\n");
      s = s.replace(/\s*<\/urlset>/, "\n" + block + "\n</urlset>");
      console.log("[bump] 補登漏頁 " + missing.length + " 條:", missing.map(u => u.replace("https://" + HOST, "")).join(" "));
    }
  }
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
