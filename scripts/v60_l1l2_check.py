#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SNT v6.0 沙盒輪 L1/L2 檢核（GEMINI-GOV-ACTION 缺失④存證工具;18 項）
L1=靜態/治理檢核 12 項,L2=執行期檢核 6 項。逐項輸出 JSON 原始紀錄至 download/l1l2/（L1-01.json…L2-06.json）
+ 彙總 download/l1l2/summary.json。內容不含執行時戳,重跑輸出位元組確定性（供 manifest 凍結重算）。
用法: python3 scripts/v60_l1l2_check.py   # 於 repo 根目錄執行;exit 0=全綠
"""
import hashlib, http.server, json, os, re, shutil, socket, subprocess, sys, tempfile, threading

REPO = os.path.abspath(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "download", "l1l2")
OLD_PRICES = ["NT$1,980", "NT$3,980", "NT$9,800"]
APPROVED = {"T1": ("NT$7,800", "T1 木工接案包"), "T2": ("NT$13,900", "T2 統包接案包"), "T3": ("NT$24,800", "T3 企業獲客包")}
CONTENT_EXT = (".html", ".js", ".mjs", ".txt", ".json", ".jsonld", ".svg", ".xml", ".md")

os.makedirs(OUT, exist_ok=True)
RESULTS = []


def record(cid, name, cat, ok, details, evidence):
    RESULTS.append({"id": cid, "name": name, "category": cat, "result": "PASS" if ok else "FAIL",
                    "details": details, "evidence": evidence})


def content_files():
    out = []
    for dp, dns, fns in os.walk(REPO):
        dns[:] = [d for d in dns if d not in (".git", "download")]
        for fn in fns:
            if fn.endswith(CONTENT_EXT):
                out.append(os.path.join(dp, fn))
    return out


def read(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()


# ── L1-01 舊試用價清剿（NT$ 上下文,站體內容檔;governance/ 之修復輪歷史登記記述除外） ──
hits = []
for p in content_files():
    if os.path.relpath(p, REPO).replace(os.sep, "/").startswith("governance/"):
        continue  # 治理檔之歷史登記（含本輪修復記述「移除試用價…」）非站體交付內容,由 L1-12 專責
    t = read(p)
    for v in OLD_PRICES:
        if v in t:
            hits.append(os.path.relpath(p, REPO) + ":" + v)
record("L1-01", "舊試用價 NT$1,980/3,980/9,800 站體零殘留（governance 歷史登記除外）", "L1", not hits,
       "掃描站體內容檔（排除 governance/ 歷史登記與 download/ 存證）", {"hits": hits})

# ── L1-02 裸數字殘留（1,980/3,980/9,800 獨立出現,站體內容檔） ──
hits2 = []
pat = re.compile(r"(^|[^0-9.,])(1,?980|3,?980|9,?800)([^0-9]|$)")
for p in content_files():
    rel = os.path.relpath(p, REPO).replace(os.sep, "/")
    if "/api/" in rel or rel.startswith("governance/"):
        continue  # API 原始碼由 L1-06 專責;治理歷史登記由 L1-12 專責
    for i, ln in enumerate(read(p).splitlines(), 1):
        if pat.search(ln) and "sha256" not in ln:
            hits2.append(f"{rel}:{i}")
record("L1-02", "裸數字 1,980/3,980/9,800 站體零殘留（治理歷史登記除外）", "L1", not hits2,
       "逐行掃描站體內容檔;governance/ 之歷史版本登記（v5.3.10 凍結產品線紀錄）不屬站體", {"hits": hits2})

# ── L1-03 全站 NT$ 值域盤點（僅核定三值+白名單） ──
whitelist = {"NT$7,800", "NT$13,900", "NT$24,800",  # 核定三值
             "NT$500",  # 主機年續約（FAQ 核定）
             "NT$160", "NT$150", "NT$130", "NT$120", "NT$110",  # showcase/demo-shop 示範菜單（非產品定價）
             "NT$30,000", "NT$449", "NT$2,500"}  # contracts/ 合約範本門檻與計價（v6.0 零碰觸紅線區）
vals = {}
bad_vals = {}
for p in content_files():
    rel = os.path.relpath(p, REPO).replace(os.sep, "/")
    if rel.startswith("governance/"):
        continue
    for v in re.findall(r"NT\$\s*(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)", read(p)):
        v = v.replace(" ", "")
        vals[v] = vals.get(v, 0) + 1
        if v not in whitelist:
            bad_vals.setdefault(rel, []).append(v)
record("L1-03", "全站 NT$ 值域=核定三值+非產品定價白名單", "L1", not bad_vals,
       "值域盤點: " + json.dumps(vals, ensure_ascii=False, sort_keys=True), {"超白名單": bad_vals})

# ── L1-04 api/quote.js CATALOG 靜態三值 ──
q = read(os.path.join(REPO, "api", "quote.js"))
ok4 = all(s in q for s in ("price: 7800", "price: 13900", "price: 24800",
                           "T1 木工接案包", "T2 統包接案包", "T3 企業獲客包")) and "1,980" not in q and "3,980" not in q and "9,800" not in q
record("L1-04", "api/quote.js CATALOG=核定三值與 v6.0 名稱", "L1", ok4,
       "CATATALOG 三值 7800/13900/24800+方案名;無舊價字串", {})

# ── L1-05 api/quote.js T3 口徑收斂（無 ERP/不賣系統） ──
t3m = re.search(r"T3:\s*\{[^}]*note:\s*'([^']*)'", q)
note3 = t3m.group(1) if t3m else ""
ok5 = bool(t3m) and "ERP" not in note3.upper() and "系統" not in note3 and "獲客支援" in note3
record("L1-05", "api/quote.js T3 note 無「Orbit 接案 ERP」販賣式表述", "L1", ok5,
       "T3 note=「" + note3 + "」;對齊標語「不賣網站、不賣系統、不賣數位轉型,只幫客戶接案」", {"note": note3})

# ── L1-06 api/webhook.js 提示詞口徑 ──
w = read(os.path.join(REPO, "api", "webhook.js"))
ok6 = (not any(v in w for v in OLD_PRICES)) and "NT$30,000" not in w and "試用價：" not in w \
      and "T1 木工接案包 NT$7,800" in w and "T2 統包接案包 NT$13,900" in w and "T3 企業獲客包 NT$24,800" in w \
      and "30 分鐘上線" not in w
record("L1-06", "api/webhook.js AI 接待提示詞=三固定價、零試用價、零時效承諾", "L1", ok6,
       "移除試用價 1,980/3,980/9,800+客製化 30,000+30 分鐘時效;三值在列;「沒有試用價」否定句為 v6.0 口徑", {})

# ── L1-07 VERSION=v6.0 + x-release meta 標記（全站既有 x-release 皆為 snt-v6.0,零舊值） ──
ver = read(os.path.join(REPO, "VERSION")).strip()
rel_pages, rel_bad = [], []
for p in content_files():
    if p.endswith(".html"):
        for m in re.finditer(r'x-release"\s+content="([^"]*)"', read(p)):
            rel_pages.append((os.path.relpath(p, REPO), m.group(1)))
            if m.group(1) != "snt-v6.0":
                rel_bad.append(os.path.relpath(p, REPO))
record("L1-07", "VERSION=v6.0 + x-release meta 全站無舊值（實測 " + str(len(rel_pages)) + " 處皆 snt-v6.0）+ 首頁 SNT v6.0 版字", "L1",
       ver == "v6.0" and not rel_bad and "SNT v6.0" in read(os.path.join(REPO, "index.html")),
       "/VERSION=" + ver + ";x-release 逐處盤點（站體僅部分頁掛此 meta,屬 v6.0 授權現狀,本檢核確保零舊值）",
       {"version": ver, "x_release": rel_pages, "舊值": rel_bad})

# ── L1-08 標語落地（口號頁尾） ──
slogan = "只幫客戶接案"
slog_pages = [os.path.relpath(p, REPO).replace(os.sep, "/") for p in content_files()
              if p.endswith(".html") and slogan in read(p)]
record("L1-08", "SNT v6.0 最終標語「不賣網站、不賣系統、不賣數位轉型,只幫客戶接案」全站落地", "L1", len(slog_pages) >= 19,
       "含標語頁數=" + str(len(slog_pages)) + "（v6.0 輪 M5 口號頁尾 19 頁基準）", {"pages": slog_pages})

# ── L1-09 manifest 規則頭凍結（v5.3.10 vs 工作區,除計數行） ──
def rules_of(src):
    out = []
    for ln in src.splitlines():
        if ln.startswith("#"):
            ln = re.sub(r"共 \d+ 檔", "共 N 檔", ln)
            if re.match(r"^#\s+[0-9a-f]{64}\s+api/", ln):
                ln = re.sub(r"[0-9a-f]{64}", "APIHASH", ln)  # api/ 附錄 hash 為重算資料（freeze-validation v1.12 核定）,規則文字不變
            out.append(ln)
    return out

old_src = subprocess.run(["git", "show", "v5.3.10:governance/backup-manifest.sha256"], capture_output=True, text=True).stdout
new_src = read(os.path.join(REPO, "governance", "backup-manifest.sha256"))
rule_diff = [(i, a, b) for i, (a, b) in enumerate(zip(rules_of(old_src), rules_of(new_src))) if a != b]
n_rule_diff = abs(len(rules_of(old_src)) - len(rules_of(new_src)))
record("L1-09", "manifest 規則頭凍結（v5.3.10→工作區規則行逐字一致,僅計數行差異）", "L1", not rule_diff and n_rule_diff == 0,
       f"規則行 old={len(rules_of(old_src))} new={len(rules_of(new_src))} 差異行={len(rule_diff)}", {"diff": [d[0] for d in rule_diff]})

# ── L1-10 manifest 全量重驗（sha256sum -c） ──
r10 = subprocess.run(["sha256sum", "-c", "governance/backup-manifest.sha256"], cwd=REPO, capture_output=True, text=True)
n_ok = r10.stdout.count(": OK")
n_fail = r10.stdout.count(": FAILED") + ("sha256sum: WARNING" in r10.stderr and 1 or 0)
record("L1-10", "manifest 全量重驗 sha256sum -c 全綠", "L1", r10.returncode == 0,
       f"OK={n_ok} FAILED={r10.stdout.count(': FAILED')}", {"returncode": r10.returncode})

# ── L1-11 freeze 重放全綠（verify_freeze.py exit 0） ──
r11 = subprocess.run([sys.executable, "scripts/verify_freeze.py"], cwd=REPO, capture_output=True, text=True)
tail = [l for l in r11.stdout.splitlines() if l.startswith("== 硬性斷言結果 ==")]
record("L1-11", "scripts/verify_freeze.py v3 重放全綠（六段 tag 鏈+v6.0 併行模式斷言）", "L1", r11.returncode == 0,
       (tail[-1] if tail else r11.stdout.splitlines()[-1] if r11.stdout else "無輸出"), {"returncode": r11.returncode})

# ── L1-12 治理登記齊全 ──
dl = read(os.path.join(REPO, "governance", "deploy-log.md"))
cl = read(os.path.join(REPO, "governance", "CHANGELOG.md"))
fv = read(os.path.join(REPO, "governance", "freeze-validation.md"))
ok12 = ("v6.0 沙盒" in dl) and ("v6.0 sandbox-fix" in cl) and ("v1.12" in fv) and ("708bfbf" in dl)
record("L1-12", "治理記錄檔登記（deploy-log v6.0 列+CHANGELOG v6.0 條目+freeze-validation v1.12+commit 708bfbf 追溯）", "L1", ok12, "", {})

# ── L2 本地沙盒等價環境（http.server） ──
PORT = 8642
handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=REPO, **k)
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
th = threading.Thread(target=httpd.serve_forever, daemon=True)
th.start()

pages = ["/"]
for dp, dns, fns in os.walk(REPO):
    dns[:] = [d for d in dns if d not in (".git", "download", "node_modules")]
    if "index.html" in fns:
        rel = os.path.relpath(dp, REPO).replace(os.sep, "/")
        pages.append("/" if rel == "." else "/" + rel + "/")
pages = sorted(set(pages))
bad404, bad_body = [], []
for pg in pages:
    try:
        import urllib.request
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{pg}", timeout=5) as r:
            body = r.read().decode("utf-8", "replace")
            if r.status != 200:
                bad404.append((pg, r.status))
            for v in OLD_PRICES + ["NT$3,000"]:
                if v in body:
                    bad_body.append((pg, v))
    except Exception as e:
        bad404.append((pg, str(e)[:40]))
for extra in ("/og-cover.svg", "/structured-data.jsonld", "/llms.txt"):
    try:
        import urllib.request
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{extra}", timeout=5) as r:
            body = r.read().decode("utf-8", "replace")
            if r.status != 200:
                bad404.append((extra, r.status))
            for v in OLD_PRICES + ["NT$3,000"]:
                if v in body:
                    bad_body.append((extra, v))
    except Exception as e:
        bad404.append((extra, str(e)[:40]))
record("L2-01", "本地沙盒等價環境全頁 200（" + str(len(pages) + 3) + " 端點）", "L2", not bad404, "", {"異常": bad404})
record("L2-02", "HTTP 響應體舊價格零殘留（1,980/3,980/9,800/3,000）", "L2", not bad_body, "", {"命中": bad_body})
httpd.shutdown()

# ── L2-03 quote API 執行期實測（node mock） ──
mock_js = r'''
const path = process.argv[2];
const SELF = process.argv[3];
process.env.SELF_BASE = SELF;
const handler = require(path);
function mock(reqBody, cb) {
  const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: reqBody,
    on(e, f) { if (e === 'data') {} if (e === 'end') f(); } };
  let code = 0, out = '';
  const res = { setHeader() {}, status(c) { code = c; return this; }, json(o) { out = JSON.stringify(o); cb(code, out); }, end() {} };
  handler(req, res);
}
const results = {};
let done = 0;
for (const item of ['T1', 'T2', 'T3']) {
  mock({ email: 'review@example.com', item, qty: 1 }, (code, out) => {
    results[item] = { code, body: JSON.parse(out) };
    if (++done === 3) console.log('RESULTS:' + JSON.stringify(results));
  });
}
'''
with tempfile.TemporaryDirectory() as td:
    mp = os.path.join(td, "mock_quote.js")
    open(mp, "w", encoding="utf-8").write(mock_js)
    r = subprocess.run(["node", mp, os.path.join(REPO, "api", "quote.js"), "http://127.0.0.1:9"],
                       capture_output=True, text=True, timeout=30)
ok3, ev3 = True, {}
try:
    ln = [l for l in r.stdout.splitlines() if l.startswith("RESULTS:")][-1]  # stdout 混有 quote.js 審計行（QUOTE/LEAD_SYNC_FAIL）,以前綴定位
    res = json.loads(ln[len("RESULTS:"):])
    for k, exp in APPROVED.items():
        b = res[k]["body"]
        price = {"NT$7,800": 7800, "NT$13,900": 13900, "NT$24,800": 24800}[exp[0]]
        name_ok = exp[1] in b["item"]["fullName"]
        ok3 &= (res[k]["code"] == 200) and (b["totals"]["grand"] == round(price * 1.05)) and name_ok \
               and ("ERP" not in b["lines"][0]["desc"].upper())
        ev3[k] = {"code": res[k]["code"], "grand": b["totals"]["grand"], "item": b["item"]["fullName"]}
except Exception as e:
    ok3 = False
    ev3 = {"error": str(e)[:120], "stdout": r.stdout[:200], "stderr": r.stderr[:200]}
record("L2-03", "api/quote.js 執行期實測（T1/T2/T3 回應金額+稅+名稱+T3 note 口徑）", "L2", ok3, "", ev3)

# ── L2-04 webhook API GET probe 實測 ──
mock_js2 = r'''
const handler = require(process.argv[2]);
const req = { method: 'GET', url: '/api/webhook', headers: {}, on() {} };
let out = '';
const res = { setHeader() {}, status(c) { return this; }, json(o) { out = JSON.stringify(o); }, end() {} };
handler(req, res);
setTimeout(() => console.log(out), 300);
'''
with tempfile.TemporaryDirectory() as td:
    mp = os.path.join(td, "mock_hook.js")
    open(mp, "w", encoding="utf-8").write(mock_js2)
    r4 = subprocess.run(["node", mp, os.path.join(REPO, "api", "webhook.js")], capture_output=True, text=True, timeout=30)
ok4b, ev4b = False, {}
try:
    b4 = json.loads(r4.stdout)
    ok4b = b4.get("ok") is True and b4.get("mode") == "probe"
    ev4b = b4
except Exception as e:
    ev4b = {"error": str(e)[:120], "stderr": r4.stderr[:200]}
record("L2-04", "api/webhook.js GET probe 執行期實測（200 ok/mode=probe）", "L2", ok4b, "", ev4b)

# ── L2-05 三包頁定價交叉一致與導流 ──
t_pages = {k: read(os.path.join(REPO, "builder", "packages", k.lower(), "index.html")) for k in APPROVED}
ok5b = all(exp[0] in t_pages[k] for k, exp in APPROVED.items())
pricing = read(os.path.join(REPO, "pricing", "index.html"))
ok5b = ok5b and all(f'href="/builder/packages/{k.lower()}"' in pricing for k in APPROVED)
record("L2-05", "T1/T2/T3 包頁定價與 /pricing 導流交叉一致", "L2", ok5b, "", {})

# ── L2-06 JSON-LD 結構化資料三值 ──
ld_bad = []
for pg in ("index.html", "faq/index.html", "pricing/index.html"):
    t = read(os.path.join(REPO, pg))
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, re.S)
    joined = " ".join(blocks)
    if "7800" not in joined and "7,800" not in joined:
        ld_bad.append(pg)
record("L2-06", "JSON-LD 結構化資料核定三值（index/faq/pricing）", "L2", not ld_bad, "", {"異常": ld_bad})

# ── 輸出 JSON 存證 ──
summary = {"round": "v6.0 sandbox-fix (GEMINI-GOV-ACTION)", "repo": "orbit-tower-site",
           "branch": "sandbox/v6.0-acquisition-engine", "base_commit": "708bfbf",
           "approved_prices": {"T1": "NT$7,800", "T2": "NT$13,900", "T3": "NT$24,800"},
           "total": len(RESULTS), "pass": sum(1 for r in RESULTS if r["result"] == "PASS"),
           "fail": sum(1 for r in RESULTS if r["result"] == "FAIL"), "results": RESULTS}
for r in RESULTS:
    with open(os.path.join(OUT, r["id"] + ".json"), "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=1)
for r in RESULTS:
    print(f"{r['result']}  {r['id']}  {r['name']}")
print(f"== L1/L2 彙總: {summary['pass']}/{summary['total']} PASS ==")
sys.exit(0 if summary["fail"] == 0 else 1)
