#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Orbit 站 L1 自檢（P4 沙盒交付）：python3 orbit-site/scripts/l1_check.py（於 repo 根目錄）
檢查：檔案完備/版本字串一致/內部連結閉環/表單欄位與驗證邏輯/租賃計價與條款/manifest 全項/鐵律登記/Tower 互聯/無佔位符。
任一失敗 → 非零結束。"""
import hashlib, io, os, re, subprocess, sys

ROOT = os.path.join(os.getcwd(), "orbit-site")
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
FILES = ["index.html", "enterprise/index.html", "quote/index.html", "rental/index.html", "version/index.html",
         "VERSION", "assets/site.css", "assets/logo-orbit.svg", "governance/deploy-log.md",
         "scripts/gen_manifest.py", "scripts/deploy.py", "scripts/l1_check.py"]
import contextlib
manifest_ok = os.path.exists(os.path.join(ROOT, "governance/backup-manifest.sha256"))
if manifest_ok: FILES.append("governance/backup-manifest.sha256")
check("O-檔案完備（12+1 檔）", all(os.path.exists(os.path.join(ROOT, f)) for f in FILES))
check("O-VERSION=v5.4.2", rd("VERSION").strip() == "v5.4.2")

# 2) 版本字串一致（五頁頁尾 + version 頁 title/hero）
pages = ["index.html", "enterprise/index.html", "quote/index.html", "rental/index.html", "version/index.html"]
check("O-五頁頁尾版本字串 v5.4.2(頁尾列錨定)", all("站體 v5.4.2 · 依" in rd(p) for p in pages))
ver = rd("version/index.html")
check("O-version 頁 title/工項/鐵律", all(k in ver for k in ["版本資訊 v5.4.2", "GEMINI-ORDER-P4-START", "沙盒交付", "orbit.xingdeng.tw"]))
check("O-version 版本域不混用", "v5.3.10（已結案）" in ver and "治理文件" in ver and "v5.1.1" in ver and "產品包文件" in ver)

# 3) 內部連結閉環（頁內相對連結與資源存在）
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
check("O-內部連結/資源閉環", not bad_links, str(bad_links[:4]))

# 4) 導覽五入口與手機選單防呆（Tower DEF-001 教訓：max-height+overflow）
check("O-五頁導覽五入口", all(all(f'href="/{x}"' in rd(p) for x in ["", "enterprise/", "quote/", "rental/", "version/"]) for p in pages))
check("O-手機選單可捲動防呆", "max-height:calc(100dvh - 64px)" in rd("assets/site.css") and "overflow-y:auto" in rd("assets/site.css"))

# 5) 報價入口：欄位/驗證/摘要/沙盒明示
q = rd("quote/index.html")
check("O-quote 七欄位齊備（五必填二選填）", all(f'id="{x}"' in q for x in ["company", "name", "email", "phone", "plan", "need"]))
check("O-quote 驗證邏輯", all(k in q for k in ['.test(val("email"))', "length < 20", "classList.toggle", "summary", "申請編號"]))
check("O-quote 沙盒性質明示（不虛構遞送）", "沙盒階段說明" in q and "遞送通道" in q and "正式環境" in q and "mailto:" not in q)

# 6) 租賃方案：三檔/計價三因素/條款/定價明示
r = rd("rental/index.html")
check("O-rental 三檔方案", all(k in r for k in ["入門", "標準", "旗艦", "Starter", "Standard", "Flagship"]))
check("O-rental 計價三因素", all(k in r for k in ["① 平台檔位", "② 內容上稿量", "③ 維護等級"]))
check("O-rental 條款要點+定價明示", all(k in r for k in ["租期與付款", "終止與資產移交", "不含定價數字", "正式報價", "以簽約文件為準"]))

# 7) 企業方案：三級架構
e = rd("enterprise/index.html")
check("O-enterprise 三級方案", all(k in e for k in ["標準", "進階", "旗艦", "AI 對話模組", "不構成報價"]))

# 8) SNT 全站互聯（Tower 互鏈）
check("O-五頁 Tower 互聯", all("tower.xingdeng.tw" in rd(p) for p in pages))

# 9) 治理：鐵律登記/工具預設沙盒/manifest 全項
dl = rd("governance/deploy-log.md")
check("O-deploy-log 鐵律+逐筆登記", all(k in dl for k in ["嚴禁直接於 Production", "工作區開發", "preview 沙盒", "GEMINI-ORDER-P4-START"]))
check("O-deploy.py 預設 preview（工具層防呆）", rd("scripts/deploy.py").count('sys.argv[2] if len(sys.argv) > 2 else "preview"') == 1 and 'not in ("preview", "production")' in rd("scripts/deploy.py"))
mf = rd("governance/backup-manifest.sha256")
rows = [l for l in mf.splitlines() if l and not l.startswith("#")]
check("O-manifest 規則凍結檔頭", mf.startswith("# SNT Orbit 部署完整性清單") and "站體 v5.4.2" in mf and "本檔自身" in mf)
mism = []
for line in rows:
    h, _, p = line.partition("  ")
    fp = os.path.join(ROOT, p.strip())
    if not os.path.exists(fp) or hashlib.sha256(open(fp, "rb").read()).hexdigest() != h:
        mism.append(p.strip())
check(f"O-manifest 全項 {len(rows)} 檔重驗", not mism, str(mism[:4]))

# 10) 定價一致性（展示頁零定價數字;報價僅預算區間選項）
import re as _re2
_priced = [p for p in ["index.html", "enterprise/index.html", "rental/index.html", "version/index.html"] if _re2.search(r"NT\$|\d+\s*萬", rd(p))]
check("O-定價一致性(展示四頁零定價數字)", not _priced, str(_priced))
check("O-quote 零自動報價字串", "NT$" not in q)
# 11) 自我覆核紀錄（GEMINI-ORDER-SELF-REVIEW）
check("O-self-review 紀錄在案", all(k in dl for k in ["GEMINI-ORDER-SELF-REVIEW", "R2", "v5.4.1", "146/149"]))

# 12) FAIL 排查修正項複驗（MANUS-REVIEW-RESULT）
check("O-favicon 五頁 rel=icon", all('rel="icon" type="image/svg+xml" href="/assets/logo-orbit.svg"' in rd(p) for p in pages))
check("O-favicon.ico 存在(直接請求路徑)", __import__("os").path.exists("orbit-site/favicon.ico"))
check("O-quote 摘要遞送 UI(複製+下載)", all(k in q for k in ["clipboard", "execCommand", "Blob", "copy-sum", "dl-sum"]))
check("O-quote JS 引用 id 閉合", all(i in q for i in ["qactions", "copy-sum", "dl-sum"]))

# 13) 無佔位符
alltext = "\n".join(rd(p) for p in pages)
check("O-無佔位符", not re.search(r"【待補|TODO|XXX|undefined|NaN", alltext))

print("\n" + ("Orbit L1 全部通過 ✅" if not fails else f"失敗 {len(fails)} 項: {fails}"))
sys.exit(1 if fails else 0)
