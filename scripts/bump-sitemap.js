/* build 時自動更新 sitemap lastmod ＝ 給搜尋引擎的「這站是活的」訊號 */
const fs = require("fs");
if (fs.existsSync("sitemap.xml")) {
  let s = fs.readFileSync("sitemap.xml", "utf8");
  s = s.replace(/<lastmod>[^<]*<\/lastmod>/g, "<lastmod>" + new Date().toISOString().slice(0, 10) + "</lastmod>");
  fs.writeFileSync("sitemap.xml", s);
  console.log("[bump] sitemap lastmod ->", new Date().toISOString().slice(0, 10));
}
