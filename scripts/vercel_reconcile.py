#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SNT Deployment Reconciliation（DEF-003, COPILOT-EXEC-008）
從 Vercel API 拉取 project 全部 production 部署，輸出對帳表：
Deploy ID | Timestamp(UTC) | State | Commit(若部署帶有 git metadata；files-API 部署為 (n/a))
與 Release Registry 對照。
用法: VERCEL_TOKEN=xxx python3 scripts/vercel_reconcile.py [project] [team?]
權限:唯讀(部署列表)。"""
import json, os, sys, urllib.request
from datetime import datetime, timezone

PROJECT = sys.argv[1] if len(sys.argv) > 1 else "orbit-tower-site"
TOKEN = os.environ.get("VERCEL_TOKEN", "")
if not TOKEN:
    sys.exit("需要 VERCEL_TOKEN 環境變數")

def api(path):
    r = urllib.request.Request("https://api.vercel.com" + path, headers={"Authorization": "Bearer " + TOKEN})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode())

pid = api("/v9/projects/" + PROJECT)["id"]
deps, until = [], None
while True:
    q = f"/v6/deployments?projectId={pid}&target=production&limit=100"
    if until is not None:
        q += f"&until={until}"
    d = api(q)
    deps += d["deployments"]
    nxt = (d.get("pagination") or {}).get("next")
    if not nxt:
        break
    until = nxt
    if isinstance(until, (int, float)) and until > 9000000000000:
        until = int(until / 1000)  # ms -> s 防禦

deps.sort(key=lambda x: x["createdAt"])
print(f"# project={PROJECT} production deployments={len(deps)}")
print("# Deploy ID | Timestamp (UTC) | State | Commit (from deploy meta)")
rows = []
for d in deps:
    t = datetime.fromtimestamp(d["createdAt"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    meta = d.get("meta") or {}
    commit = meta.get("githubCommitSha") or meta.get("gitlabCommitSha") or "(n/a)"
    rows.append((d["uid"], t, d.get("readyState"), commit))
    print(f"{d['uid']} | {t} | {d.get('readyState')} | {commit[:9] if commit != '(n/a)' else commit}")
cur = [r for r in rows if r[2] == "READY"]
print(f"# current production target = 最新 READY 部署: {cur[-1][0] if cur else '(none)'}")
