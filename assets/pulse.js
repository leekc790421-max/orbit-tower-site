/* ============ SNT 脈搏主幹 SDK（全產品對接標準・零依賴）============
   任何前端（三站現行＋未來新品）只要：
     ① <meta name="x-product" content="xxx">（必填）② <meta name="x-release" content="yyy">（建議）
     ③ 引入本檔（<script src="…/pulse.js" defer></script>；跨站部署時加 data-hub 屬性指向 https://xingdeng.tw）
   即自動獲得：error/rejection/resource 即時上報、60s 心跳、旗標熱開關（維護遮欄／公告／遠端停用互動件）。
   中樞＝xingdeng.tw /api/corps?bot=ev|flags（Neon 儲存；任何異常靜默吞掉，絕不打擾頁面）。 */
(function () {
  "use strict";
  if (window.__SNT_PULSE) return; window.__SNT_PULSE = 1;
  var me = document.currentScript || {};
  var HUB = me.getAttribute("data-hub") || (/^https?:\/\/(xingdeng\.tw|www\.xingdeng\.tw)/.test(location.origin) ? location.origin : "https://xingdeng.tw");
  var PROD = (document.querySelector('meta[name="x-product"]') || {}).content || location.hostname.split(".")[0];
  var REL = (document.querySelector('meta[name="x-release"]') || {}).content || "";
  var q = [], flushT = 0, flags = { kill: {} }, rev = -1;

  function send(items) {
    if (!items || !items.length) return;
    var body = JSON.stringify({ product: PROD, release: REL, events: items });
    try {
      if (navigator.sendBeacon) {
        var bl = new Blob([body], { type: "text/plain" });
        if (navigator.sendBeacon(HUB + "/api/corps?bot=ev", bl)) return;
      }
    } catch (e) { }
    try { fetch(HUB + "/api/corps?bot=ev", { method: "POST", body: body, headers: { "content-type": "text/plain" }, keepalive: true, mode: "no-cors" }).catch(function () { }); } catch (e) { }
  }
  function flush() {
    if (!q.length) return; clearTimeout(flushT);
    var batch = q.splice(0, 18); send(batch);
  }
  function enqueue(ty, o) {
    o = o || {};
    q.push({ ty: ty.slice(0, 20), path: (o.path || location.pathname || "").slice(0, 160), ms: Number(o.ms) || 0, msg: String(o.msg || "").slice(0, 400) });
    if (q.length >= 10) flush(); else if (!flushT) flushT = setTimeout(flush, 5000);
  }
  window.__SNT_PULSE_SEND = enqueue; /* 業務可選上報：__SNT_PULSE_SEND('kpi',{msg:'plan.view'}) */

  /* ---- 捕錯三連（含資源載入失敗）---- */
  window.addEventListener("error", function (e) {
    try {
      if (e && e.target && e.target.tagName && e.target !== window) {
        var tag = e.target.tagName.toLowerCase();
        if (e.target.src || e.target.href) { enqueue("resource", { msg: tag + " " + ((e.target.src || e.target.href || "").slice(0, 300)) }); return; }
      }
      enqueue("error", { msg: ((e && (e.message || e.error && e.error.message)) || "unknown") + " @" + (((e && e.filename) || "").split("/").pop() || "") + ":" + ((e && e.lineno) || 0) });
    } catch (x) { }
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    try { enqueue("rejection", { msg: String((e && e.reason && (e.reason.message || e.reason)) || "rejection").slice(0, 380) }); } catch (x) { }
  });

  /* ---- 心跳 ---- */
  function beat() { try { enqueue("beat", { ms: Math.round(performance.now()) }); } catch (e) { } }
  setInterval(beat, 60000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); else beat(); });
  window.addEventListener("pagehide", flush);
  window.addEventListener("load", function () {
    try {
      var nav = performance.getEntriesByType("navigation")[0] || {};
      enqueue("perf", { ms: Math.round(nav.loadEventEnd || 0), msg: "ttfb:" + Math.round(nav.responseStartTime || nav.domContentLoadedEventEnd || 0) });
    } catch (e) { }
    beat();
  });

  /* ---- 旗標熱開關（45s 輪詢＋回前台即拉；服务端 no-store）---- */
  function applyFlags(f) {
    if (!f || f.rev === rev) { paintNotice(f); rev = (f || {}).rev || rev; return; }
    rev = f.rev; flags = f; paintNotice(f); 
    var b = document.body;
    if (f.maintenance) {
      b.classList.add("snt-maint");
      if (!document.getElementById("snt-maint-bar")) {
        var d = document.createElement("div"); d.id = "snt-maint-bar";
        d.setAttribute("style", "position:fixed;left:0;right:0;top:0;z-index:99999;padding:.65rem 1rem;text-align:center;font:.8rem/1.6 ui-serif,'Noto Serif TC',serif;background:linear-gradient(135deg,#3d2f12,#191320);color:#f0d185;border-bottom:1px solid #d9b25e55");
        d.textContent = pickI18n(f.noticeI18n) || f.notice ? (pickI18n(f.noticeI18n) || String(f.notice)) : "站點維護中——執事已在趕修，稍後回訪。";
        (document.body || document.documentElement).appendChild(d);
      }
    } else { var x = document.getElementById("snt-maint-bar"); if (x) x.remove(); b.classList.remove("snt-maint"); }
    ["butler", "mentor", "orb"].forEach(function (k) {
      var sel = { butler: ".bt-launcher,.bt-panel", mentor: ".sy-launcher,.sy-panel", orb: "#orb-stage" }[k];
      if (f.kill && f.kill[k]) document.querySelectorAll(sel).forEach(function (n) { n.style.setProperty("display", "none", "important"); });
    });
  }
  function pickI18n(m) { try { var l = (navigator.language || "zh").toLowerCase(); return (l.indexOf("en") === 0 && m.en) || (l.indexOf("ja") === 0 && m.ja) || m.zh || ""; } catch (e) { return ""; } }
  function paintNotice(f) { /* 非維護公告條（rev 相同也重繪，防 SPA 注入丟失）*/ }

  function pollFlags() {
    try {
      fetch(HUB + "/api/corps?bot=flags", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (j) { applyFlags(j && j.flags); })
        .catch(function (e) { enqueue("pulse", { msg: "flags-fetch " + String(e.message || e).slice(0, 120) }); });
    } catch (e) { }
  }
  pollFlags(); setInterval(pollFlags, 45000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") pollFlags(); });
})();
