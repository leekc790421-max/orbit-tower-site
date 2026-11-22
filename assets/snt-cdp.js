/* snt-cdp.js — 五站共用訪客身分與事件上報（單一檔案，各站以 <script> 引入）
 *
 * 設計原則（對應企劃書 5.1／5.2）：
 *   1. 只做加法：不改任何既有頁面邏輯，載入失敗也不影響頁面。
 *   2. 身分：snt_guest cookie（30 天），與 vip 的 vx_vid 同值語意。
 *   3. 雙軌上報：
 *      - 本站 /api/track  → growth_event（流量與來源，四站已通）
 *      - vip /api/cdp/collect → cdp_profiles / cdp_events（心理標籤與意向分數）
 *      任一失敗都不重試、不阻擋。
 *   4. 推薦碼：?ref=XXXX 存 30 天，後續事件一併帶上。
 *   5. 深度猶豫：同一頁停留 > 45 秒且無點擊 → deep_hesitation（只送一次）。
 */
(function () {
  'use strict';
  if (window.__SNT_CDP__) return;
  window.__SNT_CDP__ = true;

  var SITE = (window.SNT_SITE_ID || document.documentElement.getAttribute('data-site') || location.hostname.split('.')[0] || 'unknown');
  var CDP_URL = 'https://vip.xingdeng.tw/api/cdp/collect';
  var TRACK_URL = '/api/track';
  var DAY = 864e5;

  function cookie(k) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function setCookie(k, v, days) {
    document.cookie = k + '=' + encodeURIComponent(v) + ';path=/;max-age=' + (days * 86400) + ';SameSite=Lax';
  }

  /* ---- 訪客身分 ---- */
  var vid = cookie('snt_guest');
  if (!vid) {
    vid = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setCookie('snt_guest', vid, 30);
  }

  /* ---- 推薦碼捕捉 ---- */
  var ref = cookie('snt_ref');
  try {
    var q = new URLSearchParams(location.search).get('ref');
    if (q) { ref = String(q).slice(0, 32); setCookie('snt_ref', ref, 30); }
  } catch (e) {}

  /* ---- UTM ---- */
  var utm = {};
  try {
    var sp = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
      var v = sp.get(k);
      if (v) utm[k] = String(v).slice(0, 80);
    });
  } catch (e) {}

  function beacon(url, body) {
    try {
      var s = JSON.stringify(body);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([s], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: s, keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }

  function send(event, extra) {
    var payload = extra || {};
    var base = {
      site: SITE,
      event: event,
      path: location.pathname,
      vid: vid,
      title: (document.title || '').slice(0, 120),
      ref: document.referrer || '',
      landing: location.pathname,
      target: payload.target || ''
    };
    for (var k in utm) base[k] = utm[k];
    beacon(TRACK_URL, base);

    beacon(CDP_URL, {
      guest_id: vid,
      site_domain: location.hostname,
      event_name: event,
      referred_by: ref || null,
      payload: payload
    });
  }

  /* ---- 基本事件 ---- */
  send('page_view', { path: location.pathname });

  /* ---- LINE CTA 點擊 ---- */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="line.me"],a[href*="lin.ee"]') : null;
    if (a) send('cta_click', { target: 'line', href: a.getAttribute('href') || '' });
  }, true);

  /* ---- 表單 ---- */
  var started = {};
  document.addEventListener('focusin', function (e) {
    var f = e.target && e.target.form;
    if (!f) return;
    var id = f.id || f.getAttribute('name') || 'form';
    if (started[id]) return;
    started[id] = 1;
    send('form_start', { form_id: id });
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    send('form_submit', { form_id: (f && (f.id || f.getAttribute('name'))) || 'form' });
  }, true);

  /* ---- 深度猶豫：45 秒無互動 ---- */
  var interacted = false;
  ['click', 'keydown', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, function () { interacted = true; }, { once: true, passive: true });
  });
  setTimeout(function () {
    if (!interacted && document.visibilityState === 'visible') {
      send('deep_hesitation', { dwell: 45, path: location.pathname });
    }
  }, 45000);
})();
