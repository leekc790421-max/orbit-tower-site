/* 48h 修復計畫驗收（不依賴外部網路；/api/leads 以 fake req/res + mock fetch 實測）
 * run: node --test tests/48h-acceptance.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const require2 = createRequire(import.meta.url);

/* fake Vercel-like req/res */
function mkReq(method, body, headers = {}) {
  return { method, headers, body, on(ev, cb) { if (ev === "data" && body != null && !Buffer.isBuffer(body)) cb(Buffer.from(JSON.stringify(body))); if (ev === "end") setImmediate(cb); } };
}
function mkRes() {
  const r = { code: 200, head: {}, payload: null, ended: false };
  r.setHeader = (k, v) => { r.head[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (o) => { r.payload = o; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
}
function loadLeads(env = {}) {
  const keep = { ...process.env };
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) delete process.env[k];
  Object.assign(process.env, env);
  const p = path.join(ROOT, "api", "leads.js");
  delete require2.cache[require2.resolve(p)];
  const handler = require2(p);
  Object.assign(process.env, keep);
  return handler;
}

test("/api/leads：合法 email → 200 ok；日誌池降級不丟單", async () => {
  const handler = loadLeads(); // 無 SUPABASE env＝純降級池
  const logs = []; const orig = console.log; console.log = (...a) => logs.push(a.join(" "));
  const res = mkRes();
  await handler(mkReq("POST", { kind: "form-contact", page: "/contact", form: { name: "王小明", email: "a@b.co", company: "x", message: "hi" } }), res);
  console.log = orig;
  assert.equal(res.code, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.persisted, false, "env 未就緒應誠實標記未雙寫");
  assert.ok(logs.some((l) => l.startsWith("LEAD ") && l.includes("a@b.co")), "降級＝函式日誌池留存");
});

test("/api/leads：SUPABASE 就緒 → 雙寫 persisted:true；上游 500 → 仍 200 不丟單", async () => {
  let mode = "ok";
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: mode === "ok", status: mode === "ok" ? 201 : 500 });
  const handler = loadLeads({ SUPABASE_URL: "https://demo.supabase.co", SUPABASE_SERVICE_KEY: "k" });
  const res = mkRes();
  await handler(mkReq("POST", { form: { email: "ok@test.tw" } }), res);
  assert.equal(res.payload.persisted, true);
  mode = "bad";
  const res2 = mkRes();
  await handler(mkReq("POST", { form: { email: "ok@test.tw" } }), res2);
  assert.equal(res2.code, 200);
  assert.equal(res2.payload.persisted, false, "Supabase 掛點也不能讓訪客看到失敗");
  globalThis.fetch = origFetch;
});

test("/api/leads：email 非法 400／GET 405／OPTIONS 204", async () => {
  const handler = loadLeads();
  const r1 = mkRes(); await handler(mkReq("POST", { form: { email: "nope" } }), r1);
  assert.equal(r1.code, 400);
  const r2 = mkRes(); await handler(mkReq("GET", {}), r2);
  assert.equal(r2.code, 405);
  const r3 = mkRes(); await handler(mkReq("OPTIONS", {}), r3);
  assert.equal(r3.code, 204);
});

test("/kits→/contact?kit= 與 PLANS 對照表一致（意圖不會掉球）", () => {
  const kitsPage = read("kits/index.html");
  const contact = read("contact/index.html");
  const kitIds = [...new Set([...kitsPage.matchAll(/\/contact\?kit=([a-z0-9_-]+)/g)].map((m) => m[1]))];
  assert.ok(kitIds.length >= 3, "kits 頁至少有 personal/shop/enterprise 訂購鈕");
  for (const k of kitIds) assert.ok(new RegExp(`${k}\\s*:`).test(contact), `contact 對照表缺 kit=${k}`);
  const pricing = read("pricing/index.html");
  const planIds = [...new Set([...pricing.matchAll(/\/contact\?plan=([A-Z0-9]+)/g)].map((m) => m[1]))];
  assert.ok(planIds.length >= 3);
  for (const p of planIds) assert.ok(new RegExp(`${p}\\s*:`).test(contact), `contact 對照表缺 plan=${p}`);
  assert.ok(contact.includes('name="intent"'), "hidden intent（→/api/leads intent 欄）");
  assert.ok(contact.includes("lead-ctx"), "來意確認境條");
});

test("site.js：表單走後端優先＋失敗降級（mail+localStorage）", () => {
  const s = read("assets/site.js");
  assert.match(s, /fetch\('\/api\/leads'/);
  assert.match(s, /AbortController/);
  assert.match(s, /localStorage.setItem\('ot.leads'/);
  assert.match(s, /mailto:service@xingdeng.tw/);
});

test("privacy/terms 上線要件：canonical・og:url・robots・表單同意書連結", () => {
  for (const [p, u] of [["privacy", "https://xingdeng.tw/privacy"], ["terms", "https://xingdeng.tw/terms"]]) {
    const h = read(`${p}/index.html`);
    assert.match(h, new RegExp(`canonical" href="${u}`));
    assert.match(h, new RegExp(`property="og:url" content="${u}"`));
    assert.match(h, /index,follow/);
    assert.ok(h.includes("</html>"), "文件完整結尾（不是半份檔）");
  }
  assert.match(read("robots.txt"), /Sitemap: https:\/\/xingdeng\.tw\/sitemap\.xml/);
  assert.match(read("contact/index.html"), /href="\/privacy"/);
  assert.match(read("index.html"), /href="\/privacy">隱私權政策/);
});

test("sitemap ↔ 檔案系統一一致（補頁後無死鏈）", () => {
  const sm = read("sitemap.xml");
  const locs = [...sm.matchAll(/<loc>https:\/\/xingdeng\.tw\/([^<]*)<\/loc>/g)].map((m) => m[1].replace(/\/$/, ""));
  assert.ok(locs.length >= 20);
  for (const l of locs) {
    if (l === "3d") continue; // /3d 由部署包 merge-build 提供（產線實測 200）
    const fp = l === "" ? "index.html" : (fs.existsSync(path.join(ROOT, l)) && fs.statSync(path.join(ROOT, l)).isDirectory() ? path.join(l, "index.html") : l);
    assert.ok(fs.existsSync(path.join(ROOT, fp)), `sitemap 指向不存在的頁：/${l}`);
  }
});

test("GET /api/ai-router：無鑰→rules_engine／灌 GEMINI_API_KEY→true_llm（雙軌判定實測）", async () => {
  const { createRequire } = await import("node:module");
  const req2 = createRequire(import.meta.url);
  const p = new URL("../api/ai-router.js", import.meta.url).pathname;
  const mkRes = () => ({ code: 200, head: {}, payload: null, setHeader(k, v) { this.head[k] = v; }, status(c) { this.code = c; return this; }, json(o) { this.payload = o; return this; }, end() { return this; } });
  const orig = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY;
  delete req2.cache[req2.resolve(p)];
  const h = req2(p);
  let r = mkRes(); await h({ method: "GET", headers: {}, on(ev, cb) { if (ev === "end") setImmediate(cb); } }, r);
  assert.equal(r.code, 200, "GET 不該再 405");
  assert.equal(r.payload.front_desk_mode, "rules_engine");
  assert.equal(r.payload.providers.gemini.ready, false);
  process.env.GEMINI_API_KEY = "test-key";
  r = mkRes(); await h({ method: "GET", headers: {}, on(ev, cb) { if (ev === "end") setImmediate(cb); } }, r);
  assert.equal(r.payload.front_desk_mode, "true_llm", "金鑰掛上即翻 True LLM 軌");
  if (orig == null) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = orig;
});

test("repo 版 ai-router.js 結構掃描：四職務線＋斷路器＋脈絡夾帶都在", () => {
  const s = read("api/ai-router.js");
  for (const t of ["dev", "finance", "promo", "front_desk"]) assert.ok(s.includes(t), s ? "" : t);
  assert.match(s, /__SNT_BREAKER/);
  assert.match(s, /no-credentials|circuit-open/);
  assert.match(s, /system_instruction|role: .system./); // 脈絡＋System Prompt 原樣夾帶
});
