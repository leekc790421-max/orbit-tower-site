#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SNT Freeze Coverage 三版差異稽核重放（DEF-002, COPILOT-EXEC-008）
比對 v5.3.4 / v5.3.5 / v5.3.6 / v5.3.7(或 HEAD) 四個 git ref 之 governance/backup-manifest.sha256:
Coverage(條目集)/Exclusion(排除)/Rules(檔頭規則) 三維 diff,輸出逐版差異與判定輔助。
用法: python3 scripts/verify_freeze.py [worktree]   # 在 repo 根目錄執行
依賴: 僅 git(公開 repo 可自行 clone)。"""
import re, subprocess, sys

REPO_REFS = ["v5.3.4", "v5.3.5", "v5.3.6"]  # v5.3.7 以 worktree 現況為第四點
PAT = re.compile(r"^([0-9a-f]{64})\s+\*?(.+?)\s*$")

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

def diff(a, b, la, lb):
    ea, ra, _ = load_ref(a); eb, rb, _ = load_ref(b)
    added = sorted(set(eb) - set(ea)); removed = sorted(set(ea) - set(eb))
    changed = sorted(k for k in set(ea) & set(eb) if ea[k] != eb[k])
    rule_diff = [(i, ra[i] if i < len(ra) else "<無>", rb[i] if i < len(rb) else "<無>")
                 for i in range(max(len(ra), len(rb))) if (ra[i] if i < len(ra) else None) != (rb[i] if i < len(rb) else None)]
    print(f"== {la} → {lb} == 條目 {len(ea)}→{len(eb)} | 新增 {len(added)} | 移除 {len(removed)} | hash 變更 {len(changed)} | 檔頭規則差異行 {len(rule_diff)}")
    if added: print("  新增:", ", ".join(added))
    if removed: print("  移除:", ", ".join(removed))
    if changed: print("  hash 變更(授權修改):", ", ".join(changed))
    for i, x, y in rule_diff:
        print(f"  規則 L{i+1}:")
        print(f"    {la}: {x[:120]}")
        print(f"    {lb}: {y[:120]}")
    print()

print("SNT Freeze Validation 重放(git refs + worktree)")
pairs = [(REPO_REFS[0], REPO_REFS[1]), (REPO_REFS[1], REPO_REFS[2])]
for i in range(len(pairs)):
    diff(pairs[i][0], pairs[i][1], pairs[i][0], pairs[i][1])
diff(REPO_REFS[-1], "WORKTREE", REPO_REFS[-1], "v5.3.7(工作區)")
print("對照 governance/freeze-validation.md 之判定:全部差異應屬該文件所列核准變更;出現未列差異 = 疑似誤變動。")
