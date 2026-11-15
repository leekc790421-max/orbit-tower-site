#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vip 站部署工具（P5）：python3 vip-site/scripts/deploy.py [project] [target]
TARGET 預設 preview（沙盒）——鐵律：Production 須顯式傳入 production。
vip.xingdeng.tw 正式域於取得 Manus PASS 前嚴禁觸碰（本工具僅沙盒預設,production 需人工顯式授權）。
token 走環境變數 VERCEL_TOKEN。"""
import os, sys, json, time, base64, hashlib, urllib.request, urllib.error

PROJ = sys.argv[1] if len(sys.argv) > 1 else "vip-site"
TARGET = sys.argv[2] if len(sys.argv) > 2 else "preview"
if TARGET not in ("preview", "production"):
    sys.exit("target 僅接受 preview | production")
SRC = os.path.join(os.getcwd(), "vip-site")
T = os.environ.get('VERCEL_TOKEN') or sys.exit('需要環境變數 VERCEL_TOKEN')
A = 'https://api.vercel.com'
TEXT = {'.html', '.css', '.js', '.txt', '.xml', '.json', '.svg', '.md', '.webmanifest'}

def api(m, path, body=None):
    r = urllib.request.Request(A + path, method=m, headers={'Authorization': 'Bearer ' + T})
    data = json.dumps(body).encode() if body is not None else None
    if data: r.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(r, data, timeout=180) as resp:
            t = resp.read().decode(); return json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        print('!!', m, path, e.code, e.read().decode()[:160]); return None

files, bigs = [], []
for dp, _, fns in os.walk(SRC):
    if '/.git' in dp: continue
    for fn in fns:
        if fn == '.DS_Store': continue
        fp = os.path.join(dp, fn); rel = '/' + os.path.relpath(fp, SRC).replace(os.sep, '/')
        raw = open(fp, 'rb').read()
        ext = os.path.splitext(fn)[1].lower()
        if ext in TEXT and len(raw) < 400000:
            files.append({'file': rel, 'data': raw.decode('utf-8')})
        elif len(raw) >= 40000 or ext not in TEXT:
            sha = hashlib.sha1(raw).hexdigest(); bigs.append((raw, sha, len(raw)))
            files.append({'file': rel, 'size': len(raw), 'sha': sha})
        else:
            files.append({'file': rel, 'data': base64.b64encode(raw).decode(), 'encoding': 'base64'})
print(f'target={TARGET} | files: {len(files)} | blob uploads: {len(bigs)}')
for raw, sha, size in bigs:
    r = urllib.request.Request(A + '/v2/files', method='POST', data=raw, headers={
        'Authorization': 'Bearer ' + T, 'x-vercel-digest': sha, 'Content-Type': 'application/octet-stream'})
    try:
        urllib.request.urlopen(r, timeout=180).read()
    except urllib.error.HTTPError as e:
        if e.code in (409, 400): continue
        sys.exit(f'blob 上傳失敗 {sha[:8]} {e.code}')
if bigs: print('blobs ok')
body = {'name': PROJ, 'project': PROJ, 'files': files}
if TARGET == 'production': body['target'] = 'production'  # preview=省略 target(API 無生產別名,唯一 URL)
dep = api('POST', '/v13/deployments?abortOnFailure=true&skipAutoDetectionConfirmation=1'.replace('Failure','Fail'), body)
if not dep: sys.exit('deploy failed')
did = dep.get('uid') or dep.get('id')
for _ in range(60):
    d = api('GET', '/v13/deployments/' + did) or {}
    if d.get('ready') or d.get('readyState') == 'READY':
        print(f'READY ✓ → {dep["url"]} (id={did}, target={TARGET})'); break
    if (d.get('readyState') or '') == 'ERROR':
        print('ERROR →', json.dumps(d.get('errors'))[:200]); sys.exit(1)
    time.sleep(3)
