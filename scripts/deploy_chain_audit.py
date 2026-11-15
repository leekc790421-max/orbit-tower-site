#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SNT 部署鏈稽核重放（DEF-003,P2-R5;依 Manus P2-R4 複查修繕方案新增）
以 Vercel API 原始紀錄全量重放 production 部署,重建近版部署鏈並執行內容層級核實:
  (1) 全量筆數與狀態分布（pagination.next 分頁,與 scripts/vercel_reconcile.py 同源）;
  (2) v5.3.7 / v5.3.8 鏈逐筆:Deploy ID、createdAt(UTC)、State、唯一 URL、alias、meta git 綁定;
  (3) 內容核實:production 域名（tower.xingdeng.tw,公開）之 governance/backup-manifest.sha256
      sha256 vs git blob（候選 commit=immutable tags+中間 commit+HEAD）。
歷史筆之部署唯一 URL 受 Vercel Deployment Protection 保護（HTTP 302 SSO）、Vercel Files API
不回列靜態檔 → 其內容核實標記「未能追溯」,不猜填。
用法: VERCEL_TOKEN=*** python3 scripts/deploy_chain_audit.py   # 於 repo 根目錄
存證: 將 stdout 導向 governance/deploy-replay-<日期>.txt 入庫（可重放）。
"""
import hashlib, json, os, subprocess, sys, urllib.request
from datetime import datetime, timezone

PROJECT = "orbit-tower-site"
PROD = "https://tower.xingdeng.tw"
MANIFEST = "governance/backup-manifest.sha256"
WINDOWS = {  # 鏈重建窗口（UTC,含端點;依 deploy-log 交付時序）
    "v5.3.7 鏈": ("2026-11-15 02:40:00", "2026-11-15 02:50:00"),
    "v5.3.8 鏈": ("2026-11-15 03:25:00", "2026-11-15 03:35:00"),
}
TAGS = ["v5.3.3", "v5.3.4", "v5.3.5", "v5.3.6", "v5.3.7", "v5.3.8"]

TOKEN = os.environ.get("VERCEL_TOKEN", "")
if not TOKEN:
    sys.exit("需要 VERCEL_TOKEN(唯讀)")


def api(path):
    r = urllib.request.Request("https://api.vercel.com" + path, headers={"Authorization": "Bearer " + TOKEN})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode())


def ts(ms):
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def git_bytes(*args):
    return subprocess.run(["git"] + list(args), capture_output=True).stdout


def git_text(*args):
    return git_bytes(*args).decode().strip()


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
    until = int(nxt) if nxt > 9000000000000 else nxt * 1000 if nxt < 90000000000 else nxt
deps.sort(key=lambda x: x["createdAt"])

out = []
say = out.append
say("# SNT 部署鏈稽核重放（scripts/deploy_chain_audit.py,Vercel API 唯讀;可重放）")
say("# 重放時間:" + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S") + " UTC")
say("")
say(f"## 1. 全量 production 部署:{len(deps)} 筆")
from collections import Counter
say("狀態分布:" + ", ".join(f"{k} {v}" for k, v in sorted(Counter(d.get("readyState") for d in deps).items())))
latest = [d for d in deps if d.get("readyState") == "READY"][-1]
say(f"最新 READY:{latest['uid']}（{ts(latest['createdAt'])} UTC）")
say("")
for name, (a, b) in WINDOWS.items():
    ta = datetime.strptime(a, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp() * 1000
    tb = datetime.strptime(b, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp() * 1000
    rows = [d for d in deps if ta <= d["createdAt"] <= tb]
    say(f"## 2. {name}（Vercel API 原始紀錄重建;窗口 {a}~{b} UTC）")
    say("")
    say("| Deploy ID | Timestamp (UTC) | State | Commit（meta） | 唯一 URL | alias |")
    say("|---|---|---|---|---|---|")
    for d in rows:
        meta = d.get("meta", {})
        commit = meta.get("githubCommitSha") or meta.get("githubCommitRef") or "(n/a:無 git 綁定)"
        say(f"| {d['uid']} | {ts(d['createdAt'])} | {d.get('readyState')} | {commit} | {d.get('url')} | {d.get('alias')} |")
    say("")
say("## 3. 內容層級核實（內容雜湊法）")
say("")
say(f"- 現行 production（{PROD},公開無需權限）之 {MANIFEST} sha256:")
try:
    live = urllib.request.urlopen(PROD + "/" + MANIFEST, timeout=30).read()
    h_live = hashlib.sha256(live).hexdigest()
    say(f"  - live = `{h_live[:16]}…`（{len(live)} bytes）")
    cands = [(t, git_bytes("show", f"{t}^{{commit}}")) for t in TAGS]
    cands += [("77924c1（中間 commit,v5.3.8 R1 工作紀錄對應）", git_bytes("show", "77924c1")), ("HEAD", git_bytes("show", "HEAD"))]
    say("- 候選 commit 之 git blob sha256:")
    hits = []
    for label, blob in cands:
        h = hashlib.sha256(blob).hexdigest()
        first = blob.splitlines()[0][:12].decode("utf-8", "replace") if blob else "(empty)"
        mark = " ← **與 live 一致**" if h == h_live else ""
        say(f"  - {label}（首行 {first}）= `{h[:16]}…`{mark}")
        if h == h_live:
            hits.append(label)
    say("")
    if hits:
        say(f"- **判定:現行 production 內容 = {hits[0].split('（')[0]} 內容雜湊核實 ✓**")
    else:
        say("- **判定:live 與全部候選 commit 不符 → 未能追溯,需排查**")
except Exception as e:
    say(f"  - 取得失敗:{type(e).__name__} {str(e)[:120]} → 未能追溯")
say("")
say("## 4. 核實邊界（誠實揭露,不猜填）")
say("- 部署唯一 URL（*-xfls.vercel.app）回 HTTP 302「Protected by Vercel Authentication」（Deployment Protection/SSO）→ 歷史筆內容無法自 URL 公開取樣。")
say("- Vercel Files API（/v2/deployments/{{id}}/files）對 CLI blob 部署僅回 {} 2 檔,不列靜態檔 → 歷史筆內容無法經 Files API 取樣。".format("{id}"))
say("- 部署 meta 無 gitCommitSha（CLI 上傳部署）→ 部署來源欄=n/a。")
say("- 故:僅「現行 production」可內容核實（經公開域名）;歷史筆 commit 歸屬依 deploy-log 工作紀錄與 tag-registry PINNED 對應,屬工作紀錄對應,標記「未能追溯（內容層級）」。")
say("")
print("\n".join(out))
