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

REPO_REFS = ["v5.3.4", "v5.3.5", "v5.3.6", "v5.3.7", "v5.3.8"]  # immutable tags(不可移動,見 governance/tag-protection.md)
WORKTREE_LABEL = "v5.3.9(工作區)"  # 交付時=tag v5.3.9;次版施工時更新此標籤與期望
PAT = re.compile(r"^([0-9a-f]{64})\s+\*?(.+?)\s*$")

# ── 硬性斷言(依 governance/freeze-validation.md §1;集合=逐項精確,整數=僅計數) ──
# (entries_a, entries_b, added, removed, changed, rule_diff_lines)
EXPECT = {
    ("v5.3.4", "v5.3.5"): (108, 139, 48, 17, 14, 33),  # P2-R1 manifest 重建(§1 P2-R1 行:Coverage 108→139 +48/−17,規則整體重寫)
    ("v5.3.5", "v5.3.6"): (139, 141, {"governance/tag-protection.md", "scripts/verify_tags.sh"}, 0, 55, 1),  # P2-R2
    ("v5.3.6", "v5.3.7"): (141, 146, {"governance/deployment-registry.md", "governance/freeze-validation.md", "governance/tag-registry.txt", "scripts/vercel_reconcile.py", "scripts/verify_freeze.py"}, 0,
                            {"VERSION", "builder/demo/index.html", "builder/index.html", "builder/readme/index.html", "builder/setup/index.html", "builder/sha256/index.html", "builder/version/index.html", "builder/warranty/index.html", "compliance/index.html", "governance/CHANGELOG.md", "governance/deploy-log.md", "governance/tag-protection.md", "scripts/verify_tags.sh"}, 1),  # P2-R3
    ("v5.3.7", "v5.3.8"): (146, 146, set(), 0,
                            {"VERSION", "builder/demo/index.html", "builder/index.html", "builder/readme/index.html", "builder/setup/index.html", "builder/sha256/index.html", "builder/version/index.html", "builder/warranty/index.html", "compliance/index.html", "governance/CHANGELOG.md", "governance/deploy-log.md", "governance/deployment-registry.md", "governance/freeze-validation.md", "governance/tag-registry.txt", "scripts/verify_tags.sh"}, 0),  # P2-R4(本次補強段;manifest 本檔自我排除不入條目集,git 層級另含其重算)
}
# 工作區段(下一版施工內容)結構斷言:新增限核准清單、無移除、規則差異=計數行 1 行
WORKTREE_EXPECT = dict(
    added={"scripts/deploy_chain_audit.py", "governance/deploy-replay-2026-11-15.txt", "governance/freeze-replay-2026-11-15.txt"},
    removed=0, rules=1,
    changed={"VERSION", "builder/demo/index.html", "builder/index.html", "builder/readme/index.html", "builder/setup/index.html", "builder/sha256/index.html", "builder/version/index.html", "builder/warranty/index.html", "compliance/index.html", "governance/CHANGELOG.md", "governance/deploy-log.md", "governance/deployment-registry.md", "governance/freeze-validation.md", "governance/tag-registry.txt", "scripts/verify_freeze.py"},
)


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
        check(f"{lb} 新增(限核准清單)", set(added), WORKTREE_EXPECT["added"], fails)
        check(f"{lb} 移除", len(removed), WORKTREE_EXPECT["removed"], fails)
        check(f"{lb} hash 變更(限核定修改清單)", set(changed), WORKTREE_EXPECT["changed"], fails)
        check(f"{lb} 規則差異行", len(rule_diff), WORKTREE_EXPECT["rules"], fails)


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
