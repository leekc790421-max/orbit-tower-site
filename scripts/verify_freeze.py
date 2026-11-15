#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SNT Freeze Validation 重放 v3（v6.0 併行模式;GEMINI-GOV-ACTION 缺失⑤基準重立）
immutable tag 鏈逐段比較 v5.3.4→v5.3.5→v5.3.6→v5.3.7→v5.3.8→v5.3.9→v5.3.10（六段硬性斷言,不變）,
工作區段升級為 v6.0 併行模式（取代 P4/P5 併行模式）:
  1) Tower 交付態逐檔硬驗:工作區 governance/backup-manifest.sha256（v6.0 重算基準,149→171 條）逐檔 sha256 硬驗,零差異;
  2) v6.0 授權清單硬性斷言:v5.3.10 manifest→工作區 manifest 之差異集（hash 變更/新增/移除）逐項精確比對
     ——hash 變更限 51 檔（v6.0 輪 42 檔+修復輪 webhook.js/structured-data.jsonld/og-cover.svg/VERSION
       +governance 四檔+verify_freeze.py;api/quote.js 屬附錄重算不入條目集）,
     新增限 download/**+scripts/v60_l1l2_check.py,移除 0;
  3) api/ 附錄 12 條與工作區 api/* 原始碼雜湊逐條硬驗;
  4) 工作區檔案集 vs v5.3.10 tag 檔案集:新增限 orbit-site/**+vip-site/**+download/**(+v60_l1l2_check.py),零移除。
任一不符以非零狀態結束（exit 1）。
用法: python3 scripts/verify_freeze.py [--emit FILE]   # 於 repo 根目錄;--emit 將輸出寫入 FILE（存證）
依賴: 僅 git（公開 repo 可自行 clone）。期望值來源=governance/freeze-validation.md §1+v1.12 之 v6.0 基準重立登記。
"""
import re, subprocess, sys

REPO_REFS = ["v5.3.4", "v5.3.5", "v5.3.6", "v5.3.7", "v5.3.8", "v5.3.9", "v5.3.10"]  # immutable tags(不可移動,見 governance/tag-protection.md)
WORKTREE_LABEL = "v6.0(工作區,v6.0 裝潢產業獲客引擎對接沙盒輪)"  # v6.0 併行模式:Tower 交付態對重算基準逐檔硬驗+差異=v6.0 授權清單
PAT = re.compile(r"^([0-9a-f]{64})\s+\*?(.+?)\s*$")
APPENDIX_PAT = re.compile(r"^#\s+([0-9a-f]{64})\s+(api/\S+)\s*$")

# ── 硬性斷言(依 governance/freeze-validation.md §1;集合=逐項精確,整數=僅計數) ──
# (entries_a, entries_b, added, removed, changed, rule_diff_lines)
EXPECT = {
    ("v5.3.4", "v5.3.5"): (108, 139, 48, 17, 14, 33),  # P2-R1 manifest 重建(§1 P2-R1 行:Coverage 108→139 +48/−17,規則整體重寫)
    ("v5.3.5", "v5.3.6"): (139, 141, {"governance/tag-protection.md", "scripts/verify_tags.sh"}, 0, 55, 1),  # P2-R2
    ("v5.3.6", "v5.3.7"): (141, 146, {"governance/deployment-registry.md", "governance/freeze-validation.md", "governance/tag-registry.txt", "scripts/vercel_reconcile.py", "scripts/verify_freeze.py"}, 0,
                            {"VERSION", "builder/demo/index.html", "builder/index.html", "builder/readme/index.html", "builder/setup/index.html", "builder/sha256/index.html", "builder/version/index.html", "builder/warranty/index.html", "compliance/index.html", "governance/CHANGELOG.md", "governance/deploy-log.md", "governance/tag-protection.md", "scripts/verify_tags.sh"}, 1),  # P2-R3
    ("v5.3.7", "v5.3.8"): (146, 146, set(), 0,
                            {"VERSION", "builder/demo/index.html", "builder/index.html", "builder/readme/index.html", "builder/setup/index.html", "builder/sha256/index.html", "builder/version/index.html", "builder/warranty/index.html", "compliance/index.html", "governance/CHANGELOG.md", "governance/deploy-log.md", "governance/deployment-registry.md", "governance/freeze-validation.md", "governance/tag-registry.txt", "scripts/verify_tags.sh"}, 0),  # P2-R4(manifest 本檔自我排除不入條目集,git 層級另含其重算)
    ("v5.3.8", "v5.3.9"): (146, 149,
                            {"scripts/deploy_chain_audit.py", "governance/deploy-replay-2026-11-15.txt", "governance/freeze-replay-2026-11-15.txt"}, 0,
                            {"VERSION", "builder/demo/index.html", "builder/index.html", "builder/readme/index.html", "builder/setup/index.html", "builder/sha256/index.html", "builder/version/index.html", "builder/warranty/index.html", "compliance/index.html", "governance/CHANGELOG.md", "governance/deploy-log.md", "governance/deployment-registry.md", "governance/freeze-validation.md", "governance/tag-registry.txt", "scripts/verify_freeze.py"}, 1),  # P2-R5
    ("v5.3.9", "v5.3.10"): (149, 149, set(), 0,
                            {"VERSION", "builder/demo/index.html", "builder/index.html", "builder/readme/index.html", "builder/setup/index.html", "builder/sha256/index.html", "builder/version/index.html", "builder/warranty/index.html", "compliance/index.html", "governance/CHANGELOG.md", "governance/deploy-log.md", "governance/deployment-registry.md", "governance/freeze-validation.md", "governance/tag-registry.txt", "governance/deploy-replay-2026-11-15.txt", "governance/freeze-replay-2026-11-15.txt", "scripts/deploy_chain_audit.py", "scripts/verify_freeze.py"}, 0),  # P2-R6(工具修正輪)
}
# ── v6.0 併行模式(基準重立,freeze-validation.md v1.12): Tower 交付態對重算後之工作區 manifest 逐檔硬驗(零差異);
#    v5.3.10→工作區 manifest 差異限 v6.0 授權清單 51 檔(42+webhook.js+structured-data.jsonld+og-cover.svg+VERSION+governance 四檔+verify_freeze.py;quote.js 屬附錄);
#    新增限 download/**+scripts/v60_l1l2_check.py;零移除 ──
V60_ALLOW_CHANGED = {
    # v6.0 重構輪(708bfbf)42 檔
    "404.html", "about/index.html", "articles/a01/index.html", "articles/a02/index.html", "articles/a03/index.html",
    "articles/a04/index.html", "articles/a05/index.html", "articles/a06/index.html", "articles/a07/index.html",
    "articles/a08/index.html", "articles/a09/index.html", "articles/index.html", "builder/demo/index.html",
    "builder/index.html", "builder/packages/index.html", "builder/packages/t1/index.html", "builder/packages/t2/index.html",
    "builder/packages/t3/index.html", "builder/warranty/index.html", "checkout/confirm/index.html", "checkout/index.html",
    "contact/index.html", "demo/index.html", "departments/index.html", "diagnose/index.html", "faq/index.html",
    "index.html", "kits/index.html", "legal/index.html", "llms.txt", "orbit-tower/index.html", "pricing/index.html",
    "privacy/index.html", "quick/index.html", "reports/index.html", "showcase/demo-corp/index.html",
    "showcase/demo-personal/index.html", "showcase/demo-shop/index.html", "showcase/index.html", "terms/index.html",
    "try/index.html", "api/quote.js",  # quote.js 屬 api/ 附錄(不入條目集),列此供附錄差異對帳
    # v6.0 沙盒修復輪(GEMINI-GOV-ACTION)新增授權
    "api/webhook.js", "structured-data.jsonld", "og-cover.svg", "VERSION",
    "governance/deploy-log.md", "governance/CHANGELOG.md", "governance/freeze-validation.md",
    "governance/freeze-replay-2026-11-15.txt", "scripts/verify_freeze.py",
}
V60_ALLOW_ADDED_EXACT = {"scripts/v60_l1l2_check.py"}  # 檢核工具(供 Manus 重放);download/** 以目錄前綴授權
V60_ADDED_PREFIXES = ("download/",)


def load_ref(ref):
    src = subprocess.run(["git", "show", f"{ref}:governance/backup-manifest.sha256"],
                         capture_output=True, text=True).stdout if ref != "WORKTREE" else \
          open("governance/backup-manifest.sha256", encoding="utf-8").read()
    entries, rules, appendix = {}, [], []
    for line in src.splitlines():
        if line.startswith("#"):
            rules.append(line)
            m = APPENDIX_PAT.match(line)
            if m: appendix.append((m.group(2), m.group(1)))
            continue
        m = PAT.match(line)
        if m: entries[m.group(2)] = m.group(1)
    return entries, rules, appendix, src


def check(label, actual, want, fails):
    if isinstance(want, set):
        if actual != want:
            fails.append(f"{label}:實測 {sorted(actual) if isinstance(actual, set) else actual} ≠ 期望 {sorted(want)}")
    else:
        if actual != want:
            fails.append(f"{label}:實測 {actual} ≠ 期望 {want}")


fails = []
lines = []


def emit(s):
    lines.append(s)
    print(s)


def diff(a, b, la, lb, want=None):
    ea, ra, _, _ = load_ref(a); eb, rb, _, _ = load_ref(b)
    added = sorted(set(eb) - set(ea)); removed = sorted(set(ea) - set(eb))
    changed = sorted(k for k in set(ea) & set(eb) if ea[k] != eb[k])
    rule_diff = [(i, ra[i] if i < len(ra) else "<無>", rb[i] if i < len(rb) else "<無>")
                 for i in range(max(len(ra), len(rb))) if (ra[i] if i < len(ra) else None) != (rb[i] if i < len(rb) else None)]
    emit(f"== {la} → {lb} == 條目 {len(ea)}→{len(eb)} | 新增 {len(added)} | 移除 {len(removed)} | hash 變更 {len(changed)} | 檔頭規則差異行 {len(rule_diff)}")
    if added: emit("  新增: " + ", ".join(added))
    if removed: emit("  移除: " + ", ".join(removed))
    if changed: emit("  hash 變更(授權修改): " + ", ".join(changed))
    for i, x, y in rule_diff:
        emit(f"  規則 L{i+1}:")
        emit(f"    {la}: {x[:120]}")
        emit(f"    {lb}: {y[:120]}")
    emit("")
    if want:
        (we, wb, wadd, wrem, wchg, wrule) = want
        check(f"{la}→{lb} 條目數", (len(ea), len(eb)), (we, wb), fails)
        check(f"{la}→{lb} 新增", set(added) if isinstance(wadd, set) else len(added), wadd, fails)
        check(f"{la}→{lb} 移除", set(removed) if isinstance(wrem, set) else len(removed), wrem, fails)
        check(f"{la}→{lb} hash 變更", set(changed) if isinstance(wchg, set) else len(changed), wchg, fails)
        check(f"{la}→{lb} 規則差異行", len(rule_diff), wrule, fails)


def v60_check(tag_ref):
    """v6.0 併行模式(基準重立):Tower 交付態逐檔硬驗(對工作區 manifest)+v6.0 授權清單硬性斷言+api 附錄硬驗+工作區檔案集結構斷言。"""
    import hashlib as _h, os as _os
    # 1) Tower 交付態逐檔硬驗:工作區 manifest(v6.0 重算基準) vs 工作區實檔
    entries, rules, appendix, _ = load_ref("WORKTREE")
    mism = []
    for path, h in sorted(entries.items()):
        fp = _os.path.join(".", path)
        if not _os.path.exists(fp):
            mism.append(path + "(缺失)"); continue
        ah = _h.sha256(open(fp, "rb").read()).hexdigest()
        if ah != h: mism.append(path)
    emit(f"== Tower 交付態逐檔硬驗(v6.0 併行模式)== 基準=工作區 manifest(v6.0 重算,{len(entries)} 檔)")
    emit(f"  零變更 {len(entries) - len(mism)}/{len(entries)}" + (" | ⚠ 差異: " + ", ".join(mism[:6]) if mism else ""))
    emit("")
    if mism: fails.append("v6.0 Tower 交付檔逐檔 sha256 硬驗（" + ", ".join(mism[:6]) + "）")
    # 2) v6.0 授權清單硬性斷言:v5.3.10 manifest → 工作區 manifest
    ea, _, _, _ = load_ref(tag_ref)
    added = sorted(set(entries) - set(ea)); removed = sorted(set(ea) - set(entries))
    changed = sorted(k for k in set(ea) & set(entries) if ea[k] != entries[k])
    emit(f"== v5.3.10 基準 → v6.0 工作區基準 == 條目 {len(ea)}→{len(entries)} | 新增 {len(added)} | 移除 {len(removed)} | hash 變更 {len(changed)}")
    if added: emit("  新增: " + ", ".join(added))
    if removed: emit("  移除: " + ", ".join(removed))
    if changed: emit("  hash 變更(授權修改): " + ", ".join(changed))
    emit("")
    bad_added = [p for p in added if not p.startswith(V60_ADDED_PREFIXES) and p not in V60_ALLOW_ADDED_EXACT]
    bad_changed = [p for p in changed if p not in V60_ALLOW_CHANGED]
    def bc(label, ok, detail):
        if not ok: fails.append(f"{label}（{detail}）")
    bc("v6.0 新增限 download/**+scripts/v60_l1l2_check.py", not bad_added, ", ".join(bad_added[:6]))
    bc("v6.0 授權清單 hash 變更逐檔吻合", not bad_changed, ", ".join(bad_changed[:6]))
    bc("v6.0 零移除", not removed, ", ".join(removed[:6]))
    # 3) api/ 附錄 12 條硬驗(工作區原始碼;附錄缺失=規則頭損毀,必 FAIL)
    ap_mism = []
    api_files = sorted(f for f in _os.listdir(_os.path.join(".", "api"))) if _os.path.isdir("api") else []
    if len(appendix) != len(api_files):
        fails.append(f"v6.0 api/ 附錄條數（附錄 {len(appendix)} 條 ≠ 工作區 api/* {len(api_files)} 檔——附錄缺失=規則頭損毀）")
    for path, h in appendix:
        fp = _os.path.join(".", path)
        ah = _h.sha256(open(fp, "rb").read()).hexdigest() if _os.path.exists(fp) else "<缺失>"
        if ah != h: ap_mism.append(path)
    emit(f"== api/ 附錄硬驗 == {len(appendix)} 條" + (" | ⚠ 差異: " + ", ".join(ap_mism) if ap_mism else "全數一致"))
    emit("")
    bc("v6.0 api/ 附錄與工作區原始碼一致", not ap_mism, ", ".join(ap_mism))
    # 4) 工作區檔案集 vs tag 檔案集
    tag_tree = set(subprocess.run(["git", "-c", "core.quotepath=false", "ls-tree", "-r", "--name-only", tag_ref], capture_output=True, text=True).stdout.split())
    wt_tree = set()
    for dp, dns, fns in _os.walk("."):
        dns[:] = [d for d in dns if d != ".git"]
        for fn in fns:
            wt_tree.add(_os.path.relpath(_os.path.join(dp, fn), ".").replace(_os.sep, "/"))
    wadded = sorted(wt_tree - tag_tree); wremoved = sorted(tag_tree - wt_tree)
    bad_wadded = [p for p in wadded if not p.startswith(("orbit-site/", "vip-site/")) and not p.startswith(V60_ADDED_PREFIXES) and p not in V60_ALLOW_ADDED_EXACT]
    emit(f"== 工作區相對 {tag_ref} == 新增 {len(wadded)}(限 orbit-site/**+vip-site/**+download/**+v60_l1l2_check.py) | 移除 {len(wremoved)}(限 0)")
    if bad_wadded: emit("  ⚠ 超範新增: " + ", ".join(bad_wadded[:8]))
    if wremoved: emit("  ⚠ 移除: " + ", ".join(wremoved[:8]))
    emit("")
    bc("v6.0 工作區新增限核准範圍", not bad_wadded, ", ".join(bad_wadded[:6]))
    bc("v6.0 工作區零移除", not wremoved, ", ".join(wremoved[:6]))


emit("SNT Freeze Validation 重放 v3(git immutable tag 鏈 + 工作區 v6.0 併行模式)")
for i in range(len(REPO_REFS) - 1):
    a, b = REPO_REFS[i], REPO_REFS[i + 1]
    diff(a, b, a, b, want=EXPECT.get((a, b)))
v60_check(REPO_REFS[-1])
emit("對照 governance/freeze-validation.md 之判定:全部差異應屬該文件所列核准變更(§1+v1.12 v6.0 基準重立);出現未列差異 = 疑似誤變動。")
if fails:
    emit("")
    emit("== 硬性斷言結果 ==")
    for f in fails:
        emit("FAIL " + f)
    emit(f"共 {len(fails)} 項不符 → exit 1")
    if "--emit" in sys.argv:
        try:
            open(sys.argv[sys.argv.index("--emit") + 1], "w", encoding="utf-8").write("\n".join(lines) + "\n")
        except Exception:
            pass
    sys.exit(1)
emit("")
emit(f"== 硬性斷言結果 == 全部通過 ✅（{len(REPO_REFS) - 1} 段 immutable tag 比較 + v6.0 併行模式工作區斷言）")
if "--emit" in sys.argv:
    open(sys.argv[sys.argv.index("--emit") + 1], "w", encoding="utf-8").write("\n".join(lines) + "\n")
