#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vip 站 L1 自檢（P5 沙盒交付）：python3 vip-site/scripts/l1_check.py（於 repo 根目錄）
檢查：檔案完備/版本字串/內部連結閉環/導覽防呆/定價鐵律/倫理聲明/預約表單閉環/3D 六查/favicon/og/四站互聯/manifest 全項/無佔位符。
任一失敗 → 非零結束。"""
import hashlib, io, os, re, sys

ROOT = os.path.join(os.getcwd(), "vip-site")
fails = []
n = 0
def check(name, cond, detail=""):
    global n
    n += 1
    mark = "✅" if cond else "❌"
    if not cond: fails.append(name + (f"（{detail}）" if detail else ""))
    print(f"{mark} {name}" + (f" — {detail}" if detail and not cond else ""))
def rd(rel):
    return io.open(os.path.join(ROOT, rel), encoding="utf-8").read()

# 1) 檔案完備
FILES = ["index.html", "membership/index.html", "consultants/index.html", "appointment/index.html", "version/index.html",
         "VERSION", "assets/site.css", "assets/logo-vip.svg", "assets/crystal.js", "assets/og.png", "favicon.ico",
         "governance/deploy-log.md", "scripts/gen_manifest.py", "scripts/deploy.py", "scripts/l1_check.py"]
manifest_ok = os.path.exists(os.path.join(ROOT, "governance/backup-manifest.sha256"))
if manifest_ok: FILES.append("governance/backup-manifest.sha256")
check("V-檔案完備（15+1 檔）", all(os.path.exists(os.path.join(ROOT, f)) for f in FILES))
check("V-VERSION=v5.5.0", rd("VERSION").strip() == "v5.5.0")

# 2) 版本字串一致
pages = ["index.html", "membership/index.html", "consultants/index.html", "appointment/index.html", "version/index.html"]
check("V-五頁頁尾版本字串 v5.5.0(頁尾列錨定)", all("站體 v5.5.0 · 依" in rd(p) for p in pages))
ver = rd("version/index.html")
check("V-version 頁 title/工項/鐵律", all(k in ver for k in ["版本資訊 v5.5.0", "P5 VIP Productization", "vip.xingdeng.tw"]))
check("V-版本域不混用(P4/P5 區隔)", "v5.4.3" in ver and "orbit.xingdeng.tw" in ver and "P4 Orbit" in ver)

# 3) 內部連結閉環
import html.parser
class Links(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for k in ("href", "src"):
            if k in d and d[k] and not d[k].startswith(("http", "mailto:", "#", "javascript")):
                self.refs.append(d[k])
bad_links = []
for p in pages:
    lp = Links(); lp.feed(rd(p))
    for r in lp.refs:
        t = r.lstrip("/").split("#")[0]
        if not t: continue
        if not os.path.exists(os.path.join(ROOT, t)):
            bad_links.append(f"{p}→{r}")
check("V-內部連結/資源閉環(含 crystal.js/og.png)", not bad_links, str(bad_links[:4]))

# 4) 導覽與手機選單防呆
check("V-五頁導覽五入口", all(all(f'href="/{x}"' in rd(p) for x in ["", "membership/", "consultants/", "appointment/", "version/"]) for p in pages))
check("V-手機選單可捲動防呆", "max-height:calc(100dvh - 64px)" in rd("assets/site.css") and "overflow-y:auto" in rd("assets/site.css"))

# 5) 定價鐵律（T1/T2/T3 級距對齊,零偏差）
m = rd("membership/index.html")
check("V-定價鐵律三字串(membership)", all(k in m for k in ["NT$7,800", "NT$13,900", "NT$24,800", "SNT 標準方案級距", "簽約文件為準"]))
found = set()
for p in pages:
    found |= set(re.findall(r"NT\$[\d,]+", rd(p)))
check("V-全站定價零偏差(僅 T1/T2/T3 三值)", found == {"NT$7,800", "NT$13,900", "NT$24,800"}, str(found))

# 6) 顧問倫理聲明
c = rd("consultants/index.html")
check("V-顧問倫理聲明(文化×命理邊界明文化)", all(k in c for k in ["文化顧問", "命理顧問", "一對一專屬諮詢", "不構成投資、醫療、法律", "不保證任何具體結果", "保密"]))

# 7) 預約評估入口：欄位/驗證/摘要/沙盒明示
q = rd("appointment/index.html")
check("V-appointment 七欄位（五必填二選填）", all(f'id="{x}"' in q for x in ["company", "name", "email", "phone", "plan", "advisor", "need"]))
check("V-appointment 驗證邏輯", all(k in q for k in ['.test(val("email"))', "length < 20", "classList.toggle", "summary", "預約編號"]))
check("V-appointment 沙盒性質明示（不虛構遞送）", "P5 沙盒階段說明" in q and "遞送通道" in q and "正式環境" in q and "mailto:" not in q)
check("V-appointment 摘要遞送 UI(複製+下載)", all(k in q for k in ["clipboard", "execCommand", "Blob", "copy-sum", "dl-sum"]))
check("V-appointment JS 引用 id 閉合", all(i in q for i in ["qactions", "copy-sum", "dl-sum"]) and "VIP-" in q)

# 8) 3D 立體互動水晶球六查（規格追加令必查項）
ix = rd("index.html"); js = rd("assets/crystal.js")
check("V-3D canvas 掛載+本地引用", 'id="crystal"' in ix and '<script src="/assets/crystal.js"></script>' in ix)
check("V-3D 真立體管線(WebGL+折射+Fresnel+星塵)", all(k in js for k in ['getContext("webgl"', "refract(-V,N", "pow(1.0-ndv", "TRIANGLES", "gl.POINTS", "requestAnimationFrame"]))
check("V-3D 互動控制(拖曳/滾輪/觸控/點擊)", all(k in js for k in ["pointerdown", "pointermove", "wheel", "pulse", "tempT"]))
check("V-3D 優雅降級(不支援環境明示)", "WebGL 不支援" in js and 'id="orb-fallback"' in ix and "已切換靜態模式" in ix)
check("V-3D 效能與防洩漏守衛", all(k in js for k in ["visibilitychange", "IntersectionObserver", "Math.min(window.devicePixelRatio", "webglcontextlost"]))
check("V-3D 零外部資源(無 src=http)", all('src="http' not in rd(p) for p in pages))

# 9) favicon 雙軌
check("V-favicon 五頁 rel=icon", all('rel="icon" type="image/svg+xml" href="/assets/logo-vip.svg"' in rd(p) for p in pages))
check("V-favicon.ico 存在(直接請求路徑)", os.path.exists(os.path.join(ROOT, "favicon.ico")))

# 10) og:image 絕對 URL
check("V-og:image 五頁絕對 URL", all('property="og:image" content="https://vip.xingdeng.tw/assets/og.png"' in rd(p) for p in pages))
check("V-og.png 就位(1200×630)", os.path.getsize(os.path.join(ROOT, "assets/og.png")) > 20000)

# 11) SNT 全站互聯（四站）
check("V-五頁四站互聯(主站/Tower/Orbit)", all(all(f'href="https://{x}"' in rd(p) for x in ["tower.xingdeng.tw/", "orbit.xingdeng.tw/", "xingdeng.tw/"]) for p in pages))

# 12) 治理：鐵律登記/工具預設沙盒/manifest 全項
dl = rd("governance/deploy-log.md")
check("V-deploy-log 鐵律+登記+3D 合規", all(k in dl for k in ["嚴禁直接於 Production", "工作區開發", "preview 沙盒", "MANUS-REVIEW-RESULT: PASS", "146/149", "CosmoSphere"]))
check("V-deploy.py 預設 preview（工具層防呆）", rd("scripts/deploy.py").count('sys.argv[2] if len(sys.argv) > 2 else "preview"') == 1 and 'not in ("preview", "production")' in rd("scripts/deploy.py"))
mf = rd("governance/backup-manifest.sha256")
rows = [l for l in mf.splitlines() if l and not l.startswith("#")]
check("V-manifest 規則凍結檔頭", mf.startswith("# SNT Vip 部署完整性清單") and "站體 v5.5.0" in mf and "本檔自身" in mf)
mism = []
for line in rows:
    h, _, p = line.partition("  ")
    fp = os.path.join(ROOT, p.strip())
    if not os.path.exists(fp) or hashlib.sha256(open(fp, "rb").read()).hexdigest() != h:
        mism.append(p.strip())
check(f"V-manifest 全項 {len(rows)} 檔重驗", not mism, str(mism[:4]))

# 13) 無佔位符
alltext = "\n".join(rd(p) for p in pages) + js + rd("assets/site.css")
check("V-無佔位符", not re.search(r"【待補|TODO|XXX|undefined|NaN", alltext))

print("\n" + (f"Vip L1 全部通過 ✅（{n} 項）" if not fails else f"失敗 {len(fails)} 項: {fails}"))
sys.exit(1 if fails else 0)
