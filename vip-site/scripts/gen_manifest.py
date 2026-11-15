#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vip 站 manifest 生成（P5）：涵蓋 vip-site/ 部署輸出之全部檔案。
排除：本檔自身（自參照不可行）；.git 不在部署輸出範圍。
規則凍結於檔頭；重算=版本交付時核定修改之檔案。用法：python3 vip-site/scripts/gen_manifest.py（repo 根目錄）"""
import hashlib, os, sys

ROOT = os.path.join(os.getcwd(), "vip-site")
OUT = os.path.join(ROOT, "governance", "backup-manifest.sha256")
SELF_REL = "governance/backup-manifest.sha256"
RULES_FROZEN = [
    "# SNT Vip 部署完整性清單 (backup-manifest.sha256) — 站體 v5.5.1",
    "# 生成:2026-11-15,v5.5.1 修復輪(MANUS-REVIEW-RESULT: FAIL 缺失 M1/M2/M3 點對點修復;規則凍結重算;部署鐵律:工作區→沙盒→L1→L2→編版→部署)",
    "# 涵蓋:Vip 站部署輸出之全部檔案(HTML/CSS/JS/SVG/PNG/ICO/MD/TXT 等,含 VERSION 與 governance/scripts),規則凍結,僅重算。",
    "# 驗證方式:於 Vip 站輸出根目錄執行 `sha256sum -c governance/backup-manifest.sha256`,或對站點 URL 逐一比對。",
    "#",
    "# 排除規則:",
    "#   1. governance/backup-manifest.sha256 —— 本檔自身,自參照不可行。",
    "#   2. .git/ —— 版本控制內部檔案,非部署輸出。",
    "#",
]
if not os.path.isdir(ROOT):
    sys.exit("請於 repo 根目錄執行")
rows = []
for dp, _, fns in os.walk(ROOT):
    for fn in fns:
        fp = os.path.join(dp, fn)
        rel = os.path.relpath(fp, ROOT).replace(os.sep, "/")
        if rel == SELF_REL:
            continue
        h = hashlib.sha256(open(fp, "rb").read()).hexdigest()
        rows.append((h, rel))
rows.sort(key=lambda x: x[1])
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(RULES_FROZEN) + "\n")
    for h, rel in rows:
        f.write(f"{h}  {rel}\n")
print(f"Vip manifest rebuilt: {len(rows)} entries | size: {os.path.getsize(OUT)} bytes")
