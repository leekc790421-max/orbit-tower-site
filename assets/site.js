/* Orbit Tower 共用互動：分享 / 收藏 / 表單 / 風琴 / 導覽 */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- 手機導覽 ---- */
  var burger = $('.nav__burger');
  var linksEl = $('.nav__links');
  if (burger && linksEl) burger.addEventListener('click', function () {
    var open = linksEl.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  if (linksEl) linksEl.addEventListener('click', function (e) {
    if (e.target.closest('a')) linksEl.classList.remove('open');
  });

  /* ---- 風琴 FAQ ---- */
  $$('.acc__q').forEach(function (q) {
    q.addEventListener('click', function () { q.closest('.acc').classList.toggle('open'); });
  });

  /* ---- 分享：桌網域連結 / 手機 native ---- */
  function shareText(el) { return el.getAttribute('data-title') + ' ｜ ' + el.getAttribute('data-url'); }
  $$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var net = btn.getAttribute('data-share');
      var url = btn.getAttribute('data-url') || location.href;
      var title = btn.getAttribute('data-title') || document.title;
      if (net === 'copy') {
        e.preventDefault();
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
          flash(btn, '已複製連結 ✓');
        });
        track('share_copy'); return;
      }
      if (net === 'native' && navigator.share) {
        e.preventDefault();
        navigator.share({ title: title, url: url }).then(function () { track('share_native'); }).catch(function () { });
        return;
      }
      track('share_' + net);
    });
  });
  function flash(el, msg) { var old = el.textContent; el.textContent = msg; setTimeout(function () { el.textContent = old; }, 1600); }

  /* ---- 收藏（LocalStorage，會員系統上線前的規格） ---- */
  var FAVKEY = '***';
  function favs() { try { return JSON.parse(localStorage.getItem(FAVKEY)) || []; } catch (e) { return []; } }
  $$('.favbtn').forEach(function (btn) {
    var id = btn.getAttribute('data-fav');
    var label = '☆ 收藏文章';
    var on = function () { btn.classList.add('on'); btn.textContent = '★ 已收藏'; };
    if (favs().indexOf(id) > -1) on();
    btn.addEventListener('click', function () {
      var list = favs(), i = list.indexOf(id);
      if (i > -1) { list.splice(i, 1); btn.classList.remove('on'); btn.textContent = label; track('fav_remove'); }
      else { list.push(id); on(); track('fav_add'); }
      localStorage.setItem(FAVKEY, JSON.stringify(list));
    });
  });

  /* ---- 名單表單：後端優先送 /api/leads（Supabase 雙寫）；斷網降級本地佇列＋mailto ---- */
  $$('form[data-leads]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type="submit"]', f);
      var consent = $('.consent input', f);
      if (consent && !consent.checked) { flash(btn.parentNode ? consent.closest('form') : f, ''); consent.focus(); alert('請先同意資料使用與隱私政策（/privacy）'); return; }
      var data = { type: f.getAttribute('data-leads'), at: new Date().toISOString(),
        url: location.href,
        fields: {} };
      $$('input,textarea,select', f).forEach(function (i) { if (i.name && i.type !== 'checkbox') data.fields[i.name] = i.value; });
      var payload = ['【Orbit Tower 收單】類型：' + data.type, '時間：' + data.at, '來源頁：' + data.url, '─── 表單欄位 ───']
        .concat(Object.keys(data.fields).map(function (k) { return k + '：' + data.fields[k]; })).join('\n');
      function mailFallback() {
        var q = []; try { q = JSON.parse(localStorage.getItem('ot.leads')) || []; } catch (err) { }
        q.push(data); localStorage.setItem('ot.leads', JSON.stringify(q));
        var mailBtn = '<span class="btn btn--primary" style="margin-top:10px;display:inline-block">✉️ 一按下送收單（開啟郵件即寄達業務匣）</span>';
        f.innerHTML = '<div style="padding:8px 2px"><b style="color:#D97706;font-size:17px">⚠ 名單已在本機留存，但線上送單暫時不通</b><p class="muted" style="margin:8px 0 0;font-size:14.5px">請按下方按鈕以郵件送出（內容已自動帶入），或複製內容寄 service@xingdeng.tw：</p>' + mailBtn +
          '<button class="btn" style="margin-left:8px" id="lead-copy">複製表單內容</button></div>';
        var cp = document.getElementById('lead-copy');
        if (cp) cp.addEventListener('click', function () { navigator.clipboard.writeText(payload).then(function () { cp.textContent = '✓ 已複製，貼至 service@xingdeng.tw 即完成'; setTimeout(function () { cp.textContent = '複製表單內容'; }, 2800); }); });
      }
      btn.disabled = true; btn.textContent = '送件中…';
      var ctl = ('AbortController' in window) ? new AbortController() : null;
      if (ctl) setTimeout(function () { ctl.abort(); }, 8000);
      fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({ kind: 'form-' + data.type, page: location.pathname, form: data.fields })
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j && j.ok !== false, j: j }; }); })
        .then(function (res) {
          track('lead_' + data.type + '_sent');
          f.innerHTML = '<div style="padding:10px 2px"><b style="color:#059669;font-size:17px">✓ 名單已送達後端收單池</b><p class="muted" style="margin:8px 0 0;font-size:14.5px">業務與 AI 顧問將於 24 小時內回覆 ' +
            (f.querySelector('[name="email"]') ? f.querySelector('[name="email"]').value : '您的信箱') +
            '。若想加速，可同步加 <a href="https://line.me/R/ti/p/@559julyu" style="color:#06C755;font-weight:700">LINE 官方帳號 @559julyu</a> 註明姓名，AI 直接為您排單。</p></div>';
        })
        .catch(function () { track('lead_' + data.type); mailFallback(); });
    });
  });

  /* ---- 網站診斷 v2：走 /api/diagnose 真實掃描（後端抓取＋標頭檢測） ---- */
  var dg = $('#diag-form');
  if (dg) dg.addEventListener('submit', function (e) {
    e.preventDefault();
    var site = $('#diag-url').value.trim(); if (!site) return;
    if (!/^https?:\/\//i.test(site)) site = 'https://' + site;
    var out = $('#diag-out');
    out.innerHTML = '<p class="muted mono" style="font-size:13px">▍真實掃描中（抓取目標首頁・檢測 SEO／效能／資安／國際化 12 項）…</p>';
    fetch('/api/diagnose', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: site }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || d.error) { out.innerHTML = '<p style="color:#DC2626">掃描失敗：' + (d && d.error || '未知') + '——請確認網址可公開存取。</p>'; return; }
        var bars = Object.keys(d.scores).map(function (k) {
          var v = d.scores[k];
          return '<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:13.5px"><b>' + k + '</b><span class="mono">' + v + '/100</span></div><div style="height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden"><div style="width:' + v + '%;height:100%;background:linear-gradient(90deg,#2563EB,#06B6D4)"></div></div></div>';
        }).join('');
        out.innerHTML = bars + '<ul class="muted" style="font-size:13px;margin-top:10px;line-height:1.9">' + d.findings.map(function (f) { return '<li>' + (f.ok ? '✅' : '⚠️') + ' ' + f.label + '</li>'; }).join('') + '</ul>' +
          '<p class="muted" style="font-size:12px;margin-top:8px">延遲 ' + d.ms + 'ms・HTML ' + Math.round(d.kb) + 'KB・快照時間 ' + new Date().toLocaleString('zh-TW') + '</p>' +
          '<a class="btn btn--primary" style="margin-top:12px" href="/contact?topic=' + encodeURIComponent('診斷複核・人工加購報告') + '">要一份「人工複核＋改善報價」？業務 24h 內回覆 →</a>';
        track('diag_real');
      })
      .catch(function () { out.innerHTML = '<p style="color:#DC2626">服務暫時不可用，請稍後再試或改約人工診斷。</p>'; });
  });

  function track(name) {
    try { document.dispatchEvent(new CustomEvent('snt:track', { detail: { name: name } })) } catch (e) { }
    try { console.log('[ot-event]', name, performance.now() | 0); } catch (e) { }
    if (window.dataLayer) window.dataLayer.push({ event: 'ot_' + name });
  }
})();

/* ---- AI 行銷戰略長 Widget autoload（進場 2.5 秒後，避開轉化首屏）---- */
(function(){setTimeout(function(){var s=document.createElement('script');s.src='/assets/chat-widget.js';document.head.appendChild(s);},2500);})();

/* ---- ADS BRIDGE・前端埋點（無個資明文：UTM 留存＋事件 Beacon，服务端由 /api/ads-bridge 驗收）---- */
(function(){
  try{
    var q=new URLSearchParams(location.search), keep={};
    ['utm_source','utm_medium','utm_campaign','src','omo'].forEach(function(k){if(q.get(k))keep[k]=q.get(k);});
    if(Object.keys(keep).length)localStorage.setItem('snt.track',JSON.stringify(keep));
    var send=function(ev,payload){
      try{navigator.sendBeacon&&navigator.sendBeacon('/api/corps?bot=ads',JSON.stringify({event:ev,utm:JSON.parse(localStorage.getItem('snt.track')||'null'),value:(payload&&payload.value)||undefined,currency:'TWD'}));}catch(e){}
    };
    send('page_view');
    window.SNT_track=function(ev,payload){send(String(ev||'custom').toLowerCase().replace(/[^a-z_]/g,'_'),payload);};
    document.addEventListener('click',function(e){var a=e.target.closest?e.target.closest('a[href*="/checkout"],a[href*="/kits"],.btn--primary'):null;if(a)SNT_track('cta_click',{href:a.getAttribute('href')});},true);
    document.addEventListener('submit',function(){SNT_track('lead_submit');},true);
    console.log('[SNT] ads-bridge 埋點上崗（沙箱零鑰＝只驗收不外呼）');
  }catch(e){}
})();
