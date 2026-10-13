# -*- coding: utf-8 -*-
"""Vercel files API 部署：python3 deploy.py <project> <dir>（token 走環境變數 VERCEL_TOKEN）
小檔 base64 內嵌；>=40KB 或二進位檔改走 /v2/files digest 上傳，避開 10MB body 上限。"""
import os, sys, json, time, base64, hashlib, urllib.request, urllib.error, uuid

PROJ, SRC = sys.argv[1], sys.argv[2]
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

def blob_sha(raw):
    return hashlib.sha1(raw).hexdigest()

def upload_blobs(pairs):
    ok = 0
    for raw, sha, size in pairs:
        r = urllib.request.Request(A + '/v2/files', method='POST', data=raw, headers={
            'Authorization': 'Bearer ' + T, 'x-vercel-digest': sha,
            'Content-Type': 'application/octet-stream'})
        try:
            with urllib.request.urlopen(r, timeout=180) as resp: resp.read(); ok += 1
        except urllib.error.HTTPError as e:
            if e.code in (409, 400) and 'exist' in e.read().decode(errors='ignore').lower(): ok += 1
            else: print('upload fail', sha[:8], e.code); return None
    print('uploaded', ok, '/', len(pairs))
    return {}

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
            sha = blob_sha(raw); bigs.append((raw, sha, len(raw)))
            files.append({'file': rel, 'size': len(raw), 'sha': sha})
        else:
            files.append({'file': rel, 'data': base64.b64encode(raw).decode(), 'encoding': 'base64'})
print('files:', len(files), '| blob uploads:', len(bigs))
if bigs:
    if upload_blobs(bigs) is None: sys.exit('blob 上傳失敗')
    print('blobs ok')

dep = api('POST', '/v13/deployments?abortOnFail=true&skipAutoDetectionConfirmation=1',
          {'name': PROJ, 'project': PROJ, 'target': 'production', 'files': files})
if not dep: sys.exit('deploy failed')
did = dep.get('uid') or dep.get('id')
for _ in range(60):
    d = api('GET', '/v13/deployments/' + did) or {}
    if d.get('ready') or d.get('readyState') == 'READY':
        print('READY ✓ →', dep['url']); break
    if (d.get('readyState') or '') == 'ERROR':
        print('ERROR →', json.dumps(d.get('errors'))[:200]); sys.exit(1)
    time.sleep(3)
