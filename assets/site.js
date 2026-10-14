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

  /* ---- 名單表單（前端收單＋本地佇列；正式站請接 CRM／表單服務） ---- */
  $$('form[data-leads]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type="submit"]', f);
      var consent = $('.consent input', f);
      if (consent && !consent.checked) { flash(btn.parentNode ? consent.closest('form') : f, ''); consent.focus(); alert('請先同意資料使用與Privacy政策'); return; }
      var data = { type: f.getAttribute('data-leads'), at: new Date().toISOString(),
        url: location.href,
        fields: {} };
      $$('input,textarea,select', f).forEach(function (i) { if (i.name) data.fields[i.name] = i.value; });
      var q = []; try { q = JSON.parse(localStorage.getItem('ot.leads')) || []; } catch (err) { }
      q.push(data); localStorage.setItem('ot.leads', JSON.stringify(q));
      track('lead_' + data.type);
      var payload = ['【Orbit Tower 收單】類型：' + data.type, '時間：' + data.at, '來源頁：' + data.url, '─── 表單欄位 ───']
        .concat(Object.keys(data.fields).map(function (k) { return k + '：' + data.fields[k]; })).join('\n');
      var mailBtn = '<a class="btn btn--primary" style="margin-top:10px;display:inline-block" href="mailto:service@xingdeng.tw?subject=' +
        encodeURIComponent('[Orbit Tower][' + data.type + '] ' + (data.fields.company || data.fields.name || 'lead')) + '&body=' + encodeURIComponent(payload) + '">✉️ 一按下送收單（開啟郵件即寄達業務匣）</a>';
      f.innerHTML = '<div style="padding:8px 2px"><b style="color:#059669;font-size:17px">✓ 已在本機留存，下一步送出即達業務</b><p class="muted" style="margin:8px 0 0;font-size:14.5px">本表單探雙軌收單：按下方按鈕開啟郵件客戶端即送達 service@xingdeng.tw（內容已自動帶入）；若視窗未跳出，請直接複製此碼寄同址：<br><code class="mono" style="font-size:12px;word-break:break-all">' + encodeURIComponent(location.href) + '</code></p>' + mailBtn +
        '<button class="btn" style="margin-left:8px" id="lead-copy">複製表單內容</button></div>';
      var cp = document.getElementById('lead-copy');
      cp.addEventListener('click', function () { navigator.clipboard.writeText(payload).then(function () { cp.textContent = '✓ 已複製，貼至 service@xingdeng.tw 即完成'; setTimeout(function () { cp.textContent = '複製表單內容'; }, 2800); }); });
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
    try { console.log('[ot-event]', name, performance.now() | 0); } catch (e) { }
    if (window.dataLayer) window.dataLayer.push({ event: 'ot_' + name });
  }
})();

/* ---- AI 行銷戰略長 Widget autoload（進場 2.5 秒後，避開轉化首屏）---- */
(function(){setTimeout(function(){var s=document.createElement('script');s.src='/assets/chat-widget.js';document.head.appendChild(s);},2500);})();
