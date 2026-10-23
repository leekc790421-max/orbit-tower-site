/* omni.js — 全能型業務機器人・全站前端組件 v1（水晶浮窗＋Ads橋＋OMO綁單＋真數社交證明＋雙時機挽回）
   端點：/api/strategist 真答覆｜/api/corps?bot=omni 單调用入庫+評分+派工｜?bot=ads 事件轉發（無鑰緩存）
   零鑰可跑；fetch 全 timeout＋靜默降級；不擋頁面。 */
(function () {
  if (window.__OTW && window.__OTW.live) return; window.__OTW = { live: 1, booted: 0, capShown: 0, exitShown: 0 };
  var API = '/api/corps?bot=';
  var PERSONA = 'reception', hist = [], leadDone = false, engaged = false;
  var WELCOMES = {
    reception: '【星樞接待總監】您好，歡迎蒞臨光曜星樞。報上產業＋一句痛點，我當場給您一套 SWOT 起手式。',
    architect: '【首席 AI 架構師】想評估官網升級成「3D 展示＋多語 AI 接待」的技術路徑？給我產業與現有瓶頸。',
    growth: '【商務成長顧問】獲客、轉換、回購——現在最卡哪段？一句現況，我還您第一週動作。'
  };
  function el(i) { return document.getElementById(i); }
  try {
    var q = new URLSearchParams(location.search);
    var omo = q.get('omo') || q.get('code') || '', src = q.get('src') || '';
    if (omo || src) sessionStorage.setItem('otwOmo', (src ? src + ':' : '') + omo);
  } catch (e) { }
  var OMO = (function () { try { return sessionStorage.getItem('otwOmo') || ''; } catch (e) { return ''; } })();

  // ── 廣告橋：接收 site.js 的 snt:track CustomEvent（任何腳本 track 皆可轉發兵團）
  function adSend(ev, extra) { try { fetch(API + 'ads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event: String(ev).slice(0, 40), custom_data: extra || null }), keepalive: true, signal: AbortSignal.timeout(4000) }).catch(function () { }); } catch (e) { } }
  document.addEventListener('snt:track', function (e) { adSend((e.detail && e.detail.name) || 'event'); });

  var hasWidget = !!document.getElementById('orbit-tower-widget');
  if (!hasWidget) {
    document.body.insertAdjacentHTML('beforeend',
      '<div id="orbit-tower-widget" style="position:fixed;bottom:24px;right:24px;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">' +
      '<div id="orbit-chat-box" style="display:none;width:min(360px,calc(100vw - 32px));height:min(520px,calc(100vh - 140px));background:#080D1A;border:1px solid #00E5FF;border-radius:18px;box-shadow:0 12px 48px rgba(0,0,0,.8);flex-direction:column;overflow:hidden;margin-bottom:12px;">' +
      '<div style="background:#0F172A;padding:12px 16px;border-bottom:1px solid rgba(0,229,255,.3);"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:14px;font-weight:bold;color:#FFF;">光曜星樞・AI 接待中心</div><div style="font-size:11px;color:#F0C265;" id="otw-status">24/7 自動接待・rule-engine 實答 <span id="otw-social"></span></div></div><button onclick="toggleOrbitChat()" aria-label="收合" style="background:none;border:none;color:#8D919A;font-size:18px;cursor:pointer;">✕</button></div>' +
      '<div id="otw-personas" style="display:flex;gap:6px;margin-top:10px;"><button class="otw-p on" data-p="reception">接待總監</button><button class="otw-p" data-p="architect">AI 架構師</button><button class="otw-p" data-p="growth">成長顧問</button></div></div>' +
      '<div id="orbit-msg-list" style="flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;font-size:12.5px;"></div><div id="otw-capture-slot"></div>' +
      '<div style="background:#0F172A;padding:12px;border-top:1px solid rgba(0,229,255,.2);display:flex;gap:6px;"><input id="orbit-lead-input" placeholder="行業＋痛點，例：餐飲／廣告燒了沒訂位" style="flex:1;min-width:0;background:#1E293B;border:1px solid #334155;color:#FFF;padding:9px 10px;border-radius:8px;font-size:12px;"><button id="otw-send" style="background:#00E5FF;color:#00363F;border:none;padding:0 14px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:12px;">送出</button></div></div>' +
      '<div id="orbit-bubble-btn" onclick="toggleOrbitChat()" style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#0B132B,#1C2541);border:1.5px solid #00E5FF;box-shadow:0 8px 32px rgba(0,229,255,.25);padding:10px 18px;border-radius:30px;cursor:pointer;transition:transform .2s ease;"><div style="width:28px;height:28px;border-radius:50%;background:rgba(0,229,255,.2);display:flex;align-items:center;justify-content:center;color:#00E5FF;font-weight:bold;">★</div><div><div style="font-size:12px;font-weight:bold;color:#FFF;">星樞 AI 總監</div><div style="font-size:10px;color:#00E5FF;">24/7 自動接待中</div></div></div></div>' +
      '<style>#otw-personas .otw-p{flex:1;font-size:10.5px;padding:6px 4px;border-radius:8px;border:1px solid rgba(0,229,255,.35);background:transparent;color:#9BA7C0;cursor:pointer;font-family:inherit;}#otw-personas .otw-p.on{background:rgba(0,229,255,.15);color:#00E5FF;border-color:#00E5FF;font-weight:700;}.otw-ai{align-self:flex-start;max-width:88%;background:#0D253D;border:1px solid rgba(0,229,255,.2);padding:10px 14px;border-radius:12px;color:#E1E2E8;line-height:1.55;white-space:pre-wrap;}.otw-me{align-self:flex-end;max-width:88%;background:#1E293B;padding:8px 12px;border-radius:10px;color:#FFF;white-space:pre-wrap;}.otw-card{align-self:stretch;background:rgba(240,194,101,.08);border:1px dashed #F0C265;border-radius:12px;padding:12px;color:#F3E3C0;font-size:12.5px;line-height:1.6;}.otw-card b{color:#F0C265}.otw-card a{color:#00E5FF;font-weight:700;text-decoration:none;margin-right:10px}.otw-card input{width:100%;box-sizing:border-box;margin:5px 0;background:#0B1220;border:1px solid #334155;border-radius:7px;color:#fff;padding:7px 9px;font-size:12px;font-family:inherit}.otw-card button{margin-top:6px;background:#F0C265;color:#2B1E05;border:0;border-radius:7px;padding:8px 12px;font-weight:800;cursor:pointer;font-size:12px;width:100%}#orbit-bubble-btn:hover{transform:translateY(-2px) scale(1.03)}@media(max-width:560px){#orbit-tower-widget{bottom:14px;right:14px}#orbit-chat-box{height:min(64vh,480px)}}</style>');
  }

  // 以下邏輯即便本頁為內聯舊版（try）也照常接上（元素 id 相同）
  function push(cls, text) {
    var d = document.createElement('div'); d.className = cls;
    var lines = String(text).split('\n'); d.appendChild(document.createTextNode(lines[0]));
    for (var i = 1; i < lines.length; i++) { d.appendChild(document.createElement('br')); d.appendChild(document.createTextNode(lines[i])); }
    var L = el('orbit-msg-list'); if (!L) return d; L.appendChild(d); L.scrollTop = L.scrollHeight; return d;
  }
  function card(html) { var d = document.createElement('div'); d.className = 'otw-card'; d.innerHTML = html; var L = el('orbit-msg-list'); if (L) { L.appendChild(d); L.scrollTop = L.scrollHeight; } }
  window.toggleOrbitChat = function () {
    var b = el('orbit-chat-box'); if (!b) return;
    var open = b.style.display === 'none' || b.style.display === ''; b.style.display = open ? 'flex' : 'none';
    if (open && !window.__OTW.booted) { window.__OTW.booted = 1; push('otw-ai', WELCOMES[PERSONA]); pingStats(); }
    engaged = true;
  };
  function setStatus(t) { var s = el('otw-status'); if (s && s.firstChild) s.firstChild.textContent = t; }
  function orbitSend() {
    var inp = el('orbit-lead-input'), t = ((inp && inp.value) || '').trim(); if (!t) return;
    inp.value = ''; engaged = true; hist.push({ role: 'user', content: t }); push('otw-me', t); setStatus('思考中…');
    fetch('/api/strategist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: hist.slice(-12), persona: PERSONA }), signal: AbortSignal.timeout(15000) })
      .then(function (r) { return r.json(); }).then(function (d) {
        var reply = String(d.reply || '（引擎暫時休假——留下方信箱，名單直達中控台，不丟單）').replace(/\[\[LEAD_CAPTURE\]\]/g, '');
        hist.push({ role: 'assistant', content: reply }); push('otw-ai', reply);
        setStatus((d.brain || 'rule-engine') + '・已連線'); adSend('chat_msg');
        if (d.capture) showCapture();
      }).catch(function () { push('otw-ai', '網路打盹了——行業＋痛點可留下方表單，名單一樣直達中控。'); showCapture(); });
  }
  function showCapture() {
    var slot = el('otw-capture-slot'); if (window.__OTW.capShown || leadDone || !slot) return; window.__OTW.capShown = 1;
    slot.innerHTML = '<div class="otw-card"><b>第三步：留名單＝解鎖 AI 資格審查＋3D 演示預約</b><input id="otwCompany" placeholder="企業名稱（例：極光科技）"><input id="otwEmail" type="email" placeholder="信箱（報價與診斷書寄至此）"><input id="otwIndustry" placeholder="行業（例：餐飲／軟體／建案）"><button id="otwSubmit">送出・立即取得意向分數</button></div>';
    slot.querySelector('#otwSubmit').onclick = function () {
      var email = (slot.querySelector('#otwEmail').value || '').trim(), company = (slot.querySelector('#otwCompany').value || '').trim(), ind = (slot.querySelector('#otwIndustry').value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { alert('請留有效信箱'); return; }
      leadDone = 1;
      var lead = { kind: 'orbit-widget', email: email, company: company, industry: ind, intent: 'persona:' + PERSONA + (OMO ? ';omo:' + OMO : '') + ';page:' + location.pathname, page: location.pathname, message: hist.filter(function (m) { return m.role === 'user'; }).map(function (m) { return m.content; }).join('；').slice(0, 600), transcript: hist.slice(-8) };
      push('otw-me', (company || '貴賓') + '：' + email + '（名單加密直達中控' + (OMO ? '・已綁 OMO' : '') + '）');
      fetch(API + 'omni', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lead: lead }), signal: AbortSignal.timeout(12000) })
        .then(function (r) { return r.json(); }).then(function (f) {
          card('<b>✅ 名單已入庫（' + (f.persisted ? '星樞中控實時可視' : '佇列保護，不丟單') + '）</b><br>意向評分：<b>' + (f.score != null ? f.score : '—') + ' / 100</b>・分眾 <b>' + String(f.tier || '—').toUpperCase() + '</b><br>銷售漏斗下一步：' + ((f.next_steps || []).join(' → ') || '等待中控台派工') + '<br><a href="/diagnose?src=widget">→ 免費五維診斷</a><a href="/demo?src=widget">→ 3D 總部演示</a><a href="/pricing?src=widget">→ 查看方案</a>');
          slot.innerHTML = ''; adSend('Lead', { tier: f.tier, score: f.score });
        }).catch(function () { push('otw-ai', '名單暫存於您的瀏覽器佇列——中控重連後自動補遞。'); try { var qq = JSON.parse(sessionStorage.getItem('otwQ') || '[]'); qq.push(lead); sessionStorage.setItem('otwQ', JSON.stringify(qq)); } catch (e) { } });
    };
  }
  function pingStats() {
    fetch(API + 'omni&h=stats', { signal: AbortSignal.timeout(6000) }).then(function (r) { return r.json(); }).then(function (d) {
      var n = 0; (d.week || []).forEach(function (x) { n += x.n || 0; });
      var s = el('otw-social'); if (s && n > 0) s.textContent = '｜本週 ' + n + ' 份 SWOT 完成';
    }).catch(function () { });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.otw-p'); if (!b) return;
    var ps = document.querySelectorAll('#otw-personas .otw-p'); for (var i = 0; i < ps.length; i++) ps[i].classList.remove('on');
    b.classList.add('on'); PERSONA = b.getAttribute('data-p'); push('otw-ai', WELCOMES[PERSONA]);
  });
  var snd = el('otw-send'); if (snd) snd.addEventListener('click', orbitSend);
  var inp2 = el('orbit-lead-input'); if (inp2) inp2.addEventListener('keydown', function (e) { if (e.key === 'Enter') orbitSend(); });
  window.SNT = window.SNT || {}; window.SNT.omni = function (p) { return fetch(API + 'omni', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) }).then(function (r) { return r.json(); }); };
  window.SNT.requeue = function () { try { var qq = JSON.parse(sessionStorage.getItem('otwQ') || '[]'); sessionStorage.setItem('otwQ', '[]'); qq.forEach(function (l) { fetch(API + 'omni', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lead: l }) }).then(function (r) { return r.json(); }).then(function (f) { if (!f.ok) throw 0; }).catch(function () { try { var b2 = JSON.parse(sessionStorage.getItem('otwQ') || '[]'); b2.push(l); sessionStorage.setItem('otwQ', JSON.stringify(b2)); } catch (e) { } }); }); } catch (e) { } };
  setTimeout(function () { window.SNT.requeue(); }, 2500); // 斷網補遞
  setTimeout(function () {
    if (engaged || leadDone || window.__OTW.capShown) return;
    try { if (sessionStorage.getItem('otw30')) return; sessionStorage.setItem('otw30', '1'); } catch (e) { }
    card('<b>★ 30 秒眼睛測量中…</b>  停留破 30 秒＝對「數字化門面」有興趣。免費《企業 AI 成熟度×流量漏斗診斷》2 分鐘出分。<br><a href="/diagnose?src=dwell30">→ 直接開測</a><a href="javascript:toggleOrbitChat()">→ 先問 AI 總監兩句</a>');
    var bb = el('orbit-bubble-btn'); if (bb) { bb.style.boxShadow = '0 8px 32px rgba(240,194,101,.45)'; bb.style.borderColor = '#F0C265'; }
  }, 30000);
  function exitHook() {
    if (engaged || leadDone || window.__OTW.exitShown) return; window.__OTW.exitShown = 1;
    try { if (sessionStorage.getItem('otwExit')) return; sessionStorage.setItem('otwExit', '1'); } catch (e) { }
    setStatus('成長顧問接手・最後一句');
    if (el('orbit-chat-box')) { el('orbit-chat-box').style.display = 'flex'; window.__OTW.booted = 1; }
    push('otw-ai', '【商務成長顧問】別急著走——留公司＋信箱，免費出《五維診斷書》＋90 天獲客排程；名單直達中控台，不打擾第二遍。');
    showCapture(); adSend('exit_intent');
  }
  setTimeout(exitHook, 70000);
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY < 4) exitHook(); });
})();

/* ---- 到訪信標（聚合計數，零個資）----
   只送 pathname 與 referrer 的「來源域」；後端寫入 hits(day,kind,key,n) 聚合行。
   不送 IP／UA 原文／cookie／裝置指紋；中控台與內部頁不計，避免自測污染真數。
   失誤安全：任何異常靜默吞掉，絕不影響頁面。 */
(function () {
  try {
    if (window.__OT_HIT) return; window.__OT_HIT = 1;
    var p = location.pathname || '/';
    if (/^\/(pool|ops)(\/|$)/.test(p)) return;
    if (location.hostname.indexOf('localhost') > -1 || location.hostname.indexOf('127.0.0.1') > -1) return;
    var q = '/api/corps?bot=hit&p=' + encodeURIComponent(p.slice(0, 160)) + '&r=' + encodeURIComponent(document.referrer || '').slice(0, 200);
    if (navigator.sendBeacon) { try { if (navigator.sendBeacon(q)) return; } catch (e) { } }
    fetch(q, { method: 'POST', mode: 'no-cors', keepalive: true }).catch(function () { });
  } catch (e) { }
})();
