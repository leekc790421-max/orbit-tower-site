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
      f.innerHTML = '<div style="padding:8px 2px"><b style="color:#059669;font-size:17px">✓ 已收到，感謝你！</b><p class="muted" style="margin:8px 0 0;font-size:14.5px">我們已將資料記在本機佇列（正式站將自動通知業務並發送 Email）。' +
        (data.type === 'report' ? '报告下載連結稍後會寄到你的信箱。' : '業務团队會在 24 小時內與你聯繫。') + '</p></div>';
    });
  });

  /* ---- 網站診斷 v0（client 端初步评分，正式版接后端爬取） ---- */
  var dg = $('#diag-form');
  if (dg) dg.addEventListener('submit', function (e) {
    e.preventDefault();
    var site = $('#diag-url').value.trim(); if (!site) return;
    var out = $('#diag-out');
    out.innerHTML = '<p class="muted mono" style="font-size:13px">▍掃描中（正式版将由后端執行 SEO／性能／多语检测）…</p>';
    setTimeout(function () {
      var scores = { '網站體驗': 62, 'SEO 分數': 71, '國際化能力': 38, 'AI 成熟度': 9, '品牌展示能力': 45 };
      var rows = Object.keys(scores).map(function (k) {
        var v = scores[k];
        return '<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:13.5px"><b>' + k + '</b><span class="mono">' + v + '/100</span></div>' +
          '<div style="height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden"><div style="width:' + v + '%;height:100%;background:linear-gradient(90deg,#2563EB,#06B6D4)"></div></div></div>';
      }).join('');
      out.innerHTML = '<h3 style="margin-top:0">診斷結果（示意）— ' + site.replace(/</g, '') + '</h3>' + rows +
        '<p class="muted" style="font-size:13.5px">最弱項：<b>AI 成熟度 9/100</b>。你的網站尚未具備 24 小時接待與導購能力。</p>' +
        '<a class="btn btn--primary btn--lg" href="/demo/">立即體驗 Orbit Tower 補強 →</a>';
      track('diagnose_done');
    }, 900);
  });

  /* ---- 極輕量事件追蹤（正式站替換為 GA4 events） ---- */
  function track(name) {
    try { console.log('[ot-event]', name, performance.now() | 0); } catch (e) { }
    if (window.dataLayer) window.dataLayer.push({ event: 'ot_' + name });
  }
})();
