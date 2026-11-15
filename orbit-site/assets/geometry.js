/* 光曦星軌 Orbit · 動態幾何背景層 v1.0（站體 v5.4.4,依 GEMINI-GOV-ADDENDUM）
   程序化時間演化不規則幾何(Procedural Time-Evolving Irregular Geometry):
   晶體切面多邊形——頂點半徑隨時間正弦偏移(不規則形變)、慢速自轉、半透明光影呼吸律動。
   純原生 Canvas 2D,零外部依賴;DPR≤2;visibilitychange/IntersectionObserver 暫停;
   prefers-reduced-motion → 單一靜態構圖(不空白、不動畫)。pointer-events:none 由 CSS 保證。 */
(function () {
  "use strict";
  var cv = document.getElementById("geo-bg");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  if (!ctx) { cv.style.display = "none"; return; }
  var prm = false;
  if (window.matchMedia) {
    try { prm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  }
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  function fit() {
    W = window.innerWidth || 1280; H = window.innerHeight || 800;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  /* 種子隨機(固定構圖血統,各端一致) */
  var seed = 20261115;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  /* 晶體切面群:8 片不規則多邊形,頂點數/半徑/轉速/形變頻率各異 */
  var SHARDS = [];
  var N = 8;
  for (var i = 0; i < N; i++) {
    var verts = 7 + Math.floor(rnd() * 4);            /* 7–10 頂點 */
    var radii = [];
    for (var v = 0; v < verts; v++) radii.push(0.72 + rnd() * 0.58);
    SHARDS.push({
      cx: 0.08 + rnd() * 0.84, cy: 0.06 + rnd() * 0.88,
      base: 0.10 + rnd() * 0.14,                       /* 相對短邊基準半徑 */
      verts: verts, radii: radii,
      rot: rnd() * 6.283, rotV: (rnd() - 0.5) * 0.10,  /* 慢速自轉 ±0.05 rad/s */
      mf: 0.10 + rnd() * 0.22,                         /* 形變頻率 Hz */
      ph: rnd() * 6.283, ph2: rnd() * 6.283,
      drift: (rnd() - 0.5) * 0.006,                    /* 緩慢漂移 */
      deep: rnd() < 0.45                               /* 深藍描邊或白描還 */
    });
  }
  function shardPath(s, t) {
    var minWH = Math.min(W, H);
    var cx = (s.cx + s.drift * t * 0.15) * W;
    var cy = (s.cy + s.drift * t * 0.1) * H;
    var rot = s.rot + t * s.rotV;
    ctx.beginPath();
    for (var k = 0; k <= s.verts; k++) {
      var idx = k % s.verts;
      var rr = s.base * minWH * s.radii[idx] * (1 + 0.16 * Math.sin(t * s.mf * 6.283 + s.ph + idx * 2.399));
      var a = rot + (idx / s.verts) * 6.283;
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var breath = 0.5 + 0.5 * Math.sin(t * 0.32);       /* 光影呼吸律動 */
    for (var i = 0; i < SHARDS.length; i++) {
      var s = SHARDS[i];
      shardPath(s, t);
      var fillA = 0.05 + 0.06 * breath + (s.deep ? 0.015 : 0.03);
      ctx.fillStyle = s.deep ? "rgba(27,95,174," + fillA.toFixed(3) + ")" : "rgba(255,255,255," + fillA.toFixed(3) + ")";
      ctx.fill();
      var strokeA = 0.16 + 0.10 * breath;
      ctx.strokeStyle = s.deep ? "rgba(27,95,174," + strokeA.toFixed(3) + ")" : "rgba(255,255,255," + (strokeA + 0.12).toFixed(3) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    /* 頂層冰藍光暈兩道,隨呼吸明滅 */
    var g1 = ctx.createRadialGradient(W * 0.82, H * 0.1, 0, W * 0.82, H * 0.1, Math.max(W, H) * 0.45);
    g1.addColorStop(0, "rgba(255,255,255," + (0.10 + 0.06 * breath).toFixed(3) + ")");
    g1.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    var g2 = ctx.createRadialGradient(W * 0.12, H * 0.86, 0, W * 0.12, H * 0.86, Math.max(W, H) * 0.4);
    g2.addColorStop(0, "rgba(191,227,255," + (0.12 + 0.08 * (1 - breath)).toFixed(3) + ")");
    g2.addColorStop(1, "rgba(191,227,255,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
  var frames = 0, running = true, visible = true, onscreen = true, last = performance.now(), t0 = last;
  window.__geo = {
    reduced: prm,
    frames: function () { return frames; },
    t: function () { return (last - t0) / 1000; }
  };
  function loop(now) {
    if (!running) return;
    var t = (now - t0) / 1000;
    draw(t);
    frames++;
    requestAnimationFrame(loop);
  }
  fit();
  window.addEventListener("resize", fit);
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; gate(); });
  if (window.IntersectionObserver) {
    try { new IntersectionObserver(function (en) { onscreen = en[0].isIntersecting; gate(); }, { threshold: 0.01 }).observe(cv); } catch (e) {}
  }
  function gate() {
    var should = visible && onscreen && !prm;
    if (should && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    if (!should) running = false;
  }
  if (prm) {
    draw(12.3);            /* 靜態構圖:單幀,不再演化(無障礙降級,畫面不空白) */
    frames = 1;
  } else {
    requestAnimationFrame(loop);
  }
})();
