#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SNT Freeze Validation 重放 v2（DEF-002;P2-R5 依 Manus P2-R4 複查修繕方案④補強）
immutable tag 鏈逐段比較 v5.3.4→v5.3.5→v5.3.6→v5.3.7→v5.3.8→工作區（下一版施工內容）,
對每段之 條目數/新增/移除/hash 變更/檔頭規則差異行 設硬性斷言;任一不符以非零狀態結束（exit 1）。
本次補強:明列 v5.3.6→v5.3.7 與 v5.3.7→v5.3.8 兩段 immutable tag 比較;工作區段為結構斷言
（新增限核准清單/無移除/規則差異=計數行）。
用法: python3 scripts/verify_freeze.py [--emit FILE]   # 於 repo 根目錄;--emit 將輸出寫入 FILE（存證）
依賴: 僅 git（公開 repo 可自行 clone）。期望值來源=governance/freeze-validation.md §1 核定差異。
"""
import re, subprocess, sys

REPO_REFS = ["v5.3.4", "v5.3.5", "v5.3.6", "v5.3.7", "v5.3.8", "v5.3.9", "v5.3.10"]  # immutable tags(不可移動,見 governance/tag-protection.md)
WORKTREE_LABEL = "v5.4.0(工作區,P4 施工中)"  # P4 起工作區段=併行模式:Tower 交付態逐檔硬驗+新增限 orbit-site/**
PAT = re.compile(r"^([0-9a-f]{64})\s+\*?(.+?)\s*$")

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
# ── P4 併行模式(P2 結案後):Tower 交付態逐檔硬驗;僅 P4 起點核定工具調整 3 檔可異動;工作區新增限 orbit-site/** ──
P4_ALLOW_CHANGED = {"scripts/verify_freeze.py", "governance/freeze-validation.md", "governance/freeze-replay-2026-11-15.txt"}


def load_ref(ref):
    src = subprocess.run(["git", "show", f"{ref}:governance/backup-manifest.sha256"],
                         capture_output=True, text=True).stdout if ref != "WORKTREE" else \
          open("governance/backup-manifest.sha256", encoding="utf-8").read()
    entries, rules = {}, []
    for line in src.splitlines():
        if line.startswith("#"):
            rules.append(line); continue
        m = PAT.match(line)
        if m: entries[m.group(2)] = m.group(1)
    return entries, rules, src


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


def diff(a, b, la, lb, want=None, wt=False):
    if wt:
        p4_check(a); return
    ea, ra, _ = load_ref(a); eb, rb, _ = load_ref(b)
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
    if wt:
        p4_check(la)


def p4_check(tag_ref):
    """P4 併行模式:Tower 交付態(v5.3.10 manifest)逐檔 sha256 硬驗+工作區檔案集比對(新增限 orbit-site/**,零移除)。"""
    import hashlib as _h, os as _os
    entries, _, _ = load_ref(tag_ref)
    mism, adjusted = [], []
    for path, h in sorted(entries.items()):
        fp = _os.path.join(".", path)
        if not _os.path.exists(fp):
            mism.append(path + "(缺失)"); continue
        ah = _h.sha256(open(fp, "rb").read()).hexdigest()
        if ah != h:
            (adjusted if path in P4_ALLOW_CHANGED else mism).append(path)
    emit(f"== Tower 交付態逐檔硬驗(P4 併行模式)== 基準=tag {tag_ref} manifest({len(entries)} 檔)")
    zero = len(entries) - len(adjusted) - len(mism)
    emit(f"  零變更 {zero}/{len(entries)} | P4 起點核定調整 {len(adjusted)}: " + ", ".join(sorted(adjusted)) + (" | ⚠ 例外未經核定: " + ", ".join(mism) if mism else ""))
    emit("")
    tag_tree = set(subprocess.run(["git", "-c", "core.quotepath=false", "ls-tree", "-r", "--name-only", tag_ref], capture_output=True, text=True).stdout.split())
    wt_tree = set()
    for dp, dns, fns in _os.walk("."):
        dns[:] = [d for d in dns if d != ".git"]
        for fn in fns:
            wt_tree.add(_os.path.relpath(_os.path.join(dp, fn), ".").replace(_os.sep, "/"))
    added = sorted(wt_tree - tag_tree); removed = sorted(tag_tree - wt_tree)
    emit(f"== 工作區相對 {tag_ref} == 新增 {len(added)}(限 orbit-site/**) | 移除 {len(removed)}(限 0)")
    if added: emit("  新增: " + ", ".join(added))
    if removed: emit("  移除: " + ", ".join(removed))
    emit("")
    def bc(label, ok, detail):
        if not ok:
            fails.append(f"{label}（{detail}）")
    bc("P4 Tower 交付檔零非核定變更(逐檔 sha256)", not mism, ", ".join(mism[:6]))
    bc("P4 起點核定調整清單", set(adjusted) == P4_ALLOW_CHANGED, f"實測 {sorted(adjusted)} ≠ 核定 {sorted(P4_ALLOW_CHANGED)}")
    bc("P4 工作區新增限 orbit-site/**", all(p.startswith("orbit-site/") for p in added), str([p for p in added if not p.startswith("orbit-site/")][:6]))
    bc("P4 工作區零移除", not removed, ", ".join(removed[:6]))


emit("SNT Freeze Validation 重放 v2(git immutable tag 鏈 + 工作區)")
for i in range(len(REPO_REFS) - 1):
    a, b = REPO_REFS[i], REPO_REFS[i + 1]
    diff(a, b, a, b, want=EXPECT.get((a, b)))
diff(REPO_REFS[-1], "WORKTREE", REPO_REFS[-1], WORKTREE_LABEL, wt=True)
emit("對照 governance/freeze-validation.md 之判定:全部差異應屬該文件所列核准變更;出現未列差異 = 疑似誤變動。")
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
emit(f"== 硬性斷言結果 == 全部通過 ✅（{len(REPO_REFS) - 1} 段 immutable tag 比較 + 工作區結構斷言）")
if "--emit" in sys.argv:
    open(sys.argv[sys.argv.index("--emit") + 1], "w", encoding="utf-8").write("\n".join(lines) + "\n")
