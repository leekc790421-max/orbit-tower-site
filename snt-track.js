/*!
 * SNT Tracking Loader v1.0.0
 * 統一漏斗追蹤：GA4（真實 ID）＋ Meta Pixel / LINE Tag（僅在提供真實 ID 時載入）
 *
 * 誠實原則：Meta Pixel 與 LINE Tag 若未設定真實 ID，本檔「不載入、不送假事件」。
 * 設定方式（任一）：
 *   1) 在頁面先定義 window.SNT_TRACK = { metaPixelId:'123...', lineTagId:'uuid' }
 *   2) 或由 /assets/snt-track-config.js 提供（部署時可替換，不需改 HTML）
 */
(function () {
  'use strict';
  if (window.__SNT_TRACK__) return;
  window.__SNT_TRACK__ = true;

  var GA4_ID = 'G-9YEQZMYNH5'; // 與 tower / orbit 現行一致的真實資源
  var cfg = window.SNT_TRACK || {};

  function isReal(v) {
    if (!v) return false;
    v = String(v).trim();
    if (!v) return false;
    if (/^0+$/.test(v)) return false;                       // 000000000000000
    if (/^x+(-x+)*$/i.test(v)) return false;                // xxxxxxxx-xxxx-...
    if (/^(YOUR|REPLACE|TODO|PLACEHOLDER)/i.test(v)) return false;
    return true;
  }

  /* ---------- GA4 ---------- */
  if (GA4_ID && !window.gtag) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, { anonymize_ip: true, send_page_view: true });
  }
  window.sntTrack = window.sntTrack || function (event, params) {
    try { if (window.gtag) window.gtag('event', event, params || {}); } catch (e) {}
  };

  /* ---------- Meta Pixel ---------- */
  if (isReal(cfg.metaPixelId) && !window.fbq) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', cfg.metaPixelId);
    window.fbq('track', 'PageView');
  }

  /* ---------- LINE Tag ---------- */
  if (isReal(cfg.lineTagId) && !window._lt) {
    (function (g, d, o, e, n) {
      g._lt = g._lt || []; g._lt.push(['_isScriptLoaded', !0]); g._lt.push(['_event', 'pv']);
      n = d.createElement('script'); n.async = !0; n.src = '//tag.line.me/js/lt.global-v1.js';
      n.onload = function () { g._lt.push(['_isScriptReady', !0]); };
      (e = d.getElementsByTagName('script')[0]).parentNode.insertBefore(n, e);
    })(window, document);
  }

  /* ---------- 跨站歸因：把 UTM 存進 session，供表單一併送出 ---------- */
  try {
    var q = new URLSearchParams(location.search);
    var src = q.get('utm_source');
    if (src) {
      sessionStorage.setItem('snt_attr', JSON.stringify({
        utm_source: src,
        utm_medium: q.get('utm_medium') || '',
        utm_campaign: q.get('utm_campaign') || '',
        landing: location.pathname,
        ts: Date.now()
      }));
    }
  } catch (e) {}

  /* ---------- 對外提供：讀取歸因（表單可呼叫） ---------- */
  window.sntAttribution = function () {
    try { return JSON.parse(sessionStorage.getItem('snt_attr') || 'null'); } catch (e) { return null; }
  };
})();
