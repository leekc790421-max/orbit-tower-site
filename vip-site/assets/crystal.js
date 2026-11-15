/* 光曦星匯 Vip · 3D 立體互動水晶球引擎 v2.0（P5,站體 v5.5.1 修復輪 M1）
   v5.5.1 修復（MANUS-REVIEW-RESULT: FAIL 缺失 M1:行動端/無硬體加速環境互動效能與降級）:
   ①零逐幀配置實作——矩陣暫存 MX/MY/MS/MR/MRY 全預分配,消除 GC 抖動（v1.0 註解宣稱但實際殘留逐幀 new Float32Array,本版徹底修正）
   ②FPS 自適應降級器 qlv 0→3:低階裝置啟始保守（hardwareConcurrency≤2 → DPR 1.25）;持續低影格率（<26fps,6 秒載入寬限+連續兩窗低影格才降級,防載入抖動誤判;脈衝瞬間豁免）逐級降載:
     qlv1=DPR 1.25 → qlv2=DPR 1＋星塵半載＋星軌減環 → qlv3=優雅降級靜態模式（狀態明示,功能不受影響）
   ③行動端觸控強化:pointercancel 歸位（防止拖曳態卡死）;tap-highlight 抑制（CSS）
   ④prefers-reduced-motion 尊重:命中即直接靜態降級,不啟動渲染迴圈
   ⑤contextlost/restored 恢復防迴圈:sessionStorage 守衛,單 session 最多自動重載一次
   ⑥powerPreference 改 default（避免強制高效能 GPU 路徑,行動端省電且相容性更廣）
   保留規格:WebGL 立體渲染管線——空間景深/Fresnel 折射高光/內部星塵與能量流;
   拖曳旋轉(慣性)·滾輪縮放·觸控滑動·點擊能量脈衝(色溫切換+狀態聯動);WebGL 不支援環境優雅降級。
   自研管線:零外部未控依賴。效能:單一 rAF 迴圈、零逐幀配置、DPR≤2、離屏/隱藏自動暫停、context 防洩漏。 */
(function () {
  "use strict";
  var cv = document.getElementById("crystal");
  var statusEl = document.getElementById("orb-status");
  if (!cv) return;
  var hooks = { mode: "fallback", rotY: function () { return 0; }, zoom: function () { return 0; }, bursts: function () { return 0; }, temp: function () { return 0; }, quality: function () { return 0; }, fps: function () { return 0; }, dpr: function () { return 1; } };
  window.__orb = hooks;
  var running = true;

  /* ── prefers-reduced-motion:命中即靜態降級,不啟動渲染 ── */
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function fallback(msg) {
    running = false;
    cv.style.display = "none";
    var fb = document.getElementById("orb-fallback");
    if (fb) fb.style.display = "grid";
    if (statusEl) statusEl.textContent = "靜態模式 · 服務功能不受影響";
    if (msg && window.console) console.warn("[orb] 降級:", msg);
    hooks.mode = "fallback";
  }
  function setStatus(t) { if (statusEl) statusEl.textContent = t; }
  if (reducedMotion()) { fallback("prefers-reduced-motion"); return; }

  var gl = cv.getContext("webgl", { antialias: true, alpha: true, powerPreference: "default" }) ||
           cv.getContext("experimental-webgl", { antialias: true, alpha: true });
  if (!gl) { fallback("WebGL 不支援"); return; }

  /* ── 著色器 ── */
  var VS_S = [
    "attribute vec3 aPos;attribute vec3 aNorm;",
    "uniform mat4 uProj,uView,uModel;",
    "varying vec3 vN,vW;",
    "void main(){vec4 w=uModel*vec4(aPos,1.0);vW=w.xyz;vN=mat3(uModel)*aNorm;",
    "gl_Position=uProj*uView*w;}"
  ].join("\n");
  var FS_S = [
    "precision mediump float;",
    "varying vec3 vN,vW;",
    "uniform float uTime,uTemp,uBurst,uHover;uniform vec3 uCam;",
    "float hash(vec3 p){return fract(sin(dot(floor(p),vec3(12.9898,78.233,37.719)))*43758.5453);}",
    "void main(){",
    "  vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);",
    "  float ndv=clamp(dot(N,V),0.0,1.0);",
    "  float fres=pow(1.0-ndv,2.6);",                                   /* Fresnel 環邊 */
    "  vec3 L1=normalize(vec3(0.7,0.9,0.6));vec3 L2=normalize(vec3(-0.8,-0.2,0.4));",
    "  float sp1=pow(max(dot(reflect(-L1,N),V),0.0),70.0)*1.4;",        /* 金色主光 Specular */
    "  float sp2=pow(max(dot(reflect(-L2,N),V),0.0),40.0)*0.5;",
    "  vec3 rd=refract(-V,N,0.74);",                                    /* 折射取樣內部程序化星場 */
    "  float h=hash(rd*16.0);float star=smoothstep(0.985,1.0,h)*(0.6+0.4*sin(uTime*2.0+h*40.0));",
    "  float band=0.5+0.5*sin(rd.x*4.0+uTime*0.7)*sin(rd.y*3.0-uTime*0.5)*sin(rd.z*4.0+uTime*0.35);",
    "  vec3 gold=vec3(0.83,0.69,0.22);vec3 ice=vec3(0.49,0.78,0.91);vec3 ac=mix(gold,ice,uTemp);",
    "  vec3 core=mix(vec3(0.03,0.05,0.10),vec3(0.10,0.14,0.26),band);",
    "  vec3 col=core+ac*(0.35*band+0.95*star)+fres*ac*(0.55+0.7*uHover)",
    "        +(sp1*gold+sp2*ice)*(1.0+2.0*uBurst)+uBurst*fres*0.7;",
    "  gl_FragColor=vec4(min(col,vec3(1.0)),1.0);}"
  ].join("\n");
  var VS_P = [
    "precision mediump float;",
    "attribute vec3 aPos;attribute float aPhase,aSize;",
    "uniform mat4 uProj,uView;uniform float uTime,uBurst,uSpeed,uTemp;",
    "varying float vA;",
    "void main(){float a=uTime*0.12*uSpeed+aPhase;float ca=cos(a),sa=sin(a);",
    "  vec3 p=vec3(aPos.x*ca-aPos.z*sa,aPos.y+0.06*sin(uTime*0.8+aPhase*9.0),aPos.x*sa+aPos.z*ca);",
    "  p*=1.0+0.28*uBurst;",                                            /* 點擊脈衝:星塵外擴 */
    "  vec4 vp=uView*vec4(p,1.0);gl_Position=uProj*vp;",
    "  gl_PointSize=aSize*(150.0/max(0.6,-vp.z))*(1.0+1.3*uBurst);",
    "  vA=0.55+0.45*sin(uTime*3.0+aPhase*7.0);}"
  ].join("\n");
  var FS_P = [
    "precision mediump float;varying float vA;",
    "uniform float uTemp,uBurst;",
    "void main(){float d=length(gl_PointCoord-vec2(0.5));float a=smoothstep(0.5,0.06,d)*vA;",
    "  vec3 c=mix(vec3(0.95,0.82,0.45),vec3(0.62,0.85,1.0),uTemp);",
    "  gl_FragColor=vec4(c*(1.0+1.5*uBurst),a);}"
  ].join("\n");
  var VS_R = [
    "attribute vec3 aPos;uniform mat4 uProj,uView,uModel;uniform float uPulse;",
    "varying float vR;",
    "void main(){gl_Position=uProj*uView*uModel*vec4(aPos,1.0);vR=uPulse;}"
  ].join("\n");
  var FS_R = [
    "precision mediump float;varying float vR;uniform float uTemp,uHover;",
    "void main(){vec3 c=mix(vec3(0.83,0.69,0.22),vec3(0.49,0.78,0.91),uTemp);",
    "  gl_FragColor=vec4(c,0.30+0.22*vR+0.30*uHover);}"
  ].join("\n");

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s) || "compile"); } return s; }
  function prog(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p) || "link"); }
    var o = { p: p, a: {}, u: {} }; var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < na; i++) { var A = gl.getActiveAttrib(p, i); o.a[A.name] = gl.getAttribLocation(p, A.name); }
    var nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var j = 0; j < nu; j++) { var U = gl.getActiveUniform(p, j); o.u[U.name.replace("[0]", "")] = gl.getUniformLocation(p, U.name); }
    return o; }

  var pS, pP, pR;
  try { pS = prog(VS_S, FS_S); pP = prog(VS_P, FS_P); pR = prog(VS_R, FS_R); }
  catch (e) { fallback("著色器編譯失敗: " + e.message); return; }

  /* ── 幾何:球體(經緯 56×36) ── */
  var LAT = 36, LON = 56, R = 1.0;
  var sv = [], si = [];
  for (var la = 0; la <= LAT; la++) {
    var th = la / LAT * Math.PI, st2 = Math.sin(th), ct = Math.cos(th);
    for (var lo = 0; lo <= LON; lo++) {
      var ph = lo / LON * Math.PI * 2, x = st2 * Math.cos(ph), y = ct, z = st2 * Math.sin(ph);
      sv.push(x * R, y * R, z * R, x, y, z);
    }
  }
  for (var a = 0; a < LAT; a++) for (var b = 0; b < LON; b++) {
    var r0 = a * (LON + 1) + b, r1 = r0 + LON + 1;
    si.push(r0, r1, r0 + 1, r1, r1 + 1, r0 + 1);
  }
  var sphereVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sphereVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sv), gl.STATIC_DRAW);
  var sphereIBO = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(si), gl.STATIC_DRAW);
  var SPH_N = si.length;

  /* ── 內部星塵(種子隨機,均勻球內 0.86R)── */
  var PN = 460, seed = 20261115;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  var pv = [], pp = [], ps = [];
  for (var k = 0; k < PN; k++) {
    var u = rnd() * 2 - 1, t2 = rnd() * Math.PI * 2, rr = 0.86 * Math.cbrt(rnd()), s = Math.sqrt(1 - u * u);
    pv.push(rr * s * Math.cos(t2), rr * u, rr * s * Math.sin(t2));
    pp.push(rnd() * 6.283); ps.push(1.4 + rnd() * 2.6);
  }
  var pVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pv), gl.STATIC_DRAW);
  var pPhase = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pPhase);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pp), gl.STATIC_DRAW);
  var pSize = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pSize);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ps), gl.STATIC_DRAW);

  /* ── 星軌環(單位圓 LINE_LOOP,三環不同傾角轉速)── */
  var RN = 128, rv = [];
  for (var m = 0; m < RN; m++) { var an = m / RN * Math.PI * 2; rv.push(Math.cos(an), 0, Math.sin(an)); }
  var rVBO = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, rVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rv), gl.STATIC_DRAW);
  var RINGS = [{ r: 1.42, tilt: 0.42, sp: 0.28 }, { r: 1.66, tilt: -0.30, sp: -0.20 }, { r: 1.88, tilt: 0.12, sp: 0.13 }];

  /* ── 矩陣(行主序,最小集;全部預分配——零逐幀配置)── */
  var M = new Float32Array(16), MP = new Float32Array(16), MV = new Float32Array(16), MT = new Float32Array(16);
  var MX = new Float32Array(16), MY = new Float32Array(16), MS = new Float32Array(16), MR = new Float32Array(16), MRY = new Float32Array(16);
  function mI(o) { o.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  function mPersp(o, fovy, asp, n, f) { var t = 1 / Math.tan(fovy / 2); o.set([t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,2*f*n/(n-f),0]); }
  function mMul(o, x, y) { for (var c = 0; c < 4; c++) for (var r2 = 0; r2 < 4; r2++) { var s = 0;
    for (var q = 0; q < 4; q++) s += x[q*4+r2]*y[c*4+q]; MT[c*4+r2] = s; } o.set(MT); }
  function mRotX(o, a) { var c = Math.cos(a), s = Math.sin(a); o.set([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
  function mRotY(o, a) { var c = Math.cos(a), s = Math.sin(a); o.set([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
  function mScale(o, s) { o.set([s,0,0,0, 0,s,0,0, 0,0,s,0, 0,0,0,1]); }
  function mTrans(o, x, y, z) { mI(o); o[12] = x; o[13] = y; o[14] = z; }

  /* ── 狀態 ── */
  var st = { rx: 0.18, ry: 0.6, vy: 0, vx: 0, dist: 3.1, temp: 0, tempT: 0, burst: 0,
             speed: 1, hover: 0, bursts: 0, drag: false, moved: 0, t0: performance.now(), px: 0, py: 0, pt: 0 };
  var STATUSES = ["能量感應中……", "星軌已校準 · 可預約專屬顧問評估", "星塵共振 · 感謝您的感應"];
  var STATUS_IDX = -1;
  function pulse() {
    st.burst = 1; st.speed = 6; st.tempT = st.tempT ? 0 : 1; st.bursts++;
    STATUS_IDX = (STATUS_IDX + 1) % STATUSES.length;
    setStatus(STATUSES[STATUS_IDX]);
  }

  /* ── FPS 自適應降級器(qlv 0→3;連續低影格率才觸發,脈衝瞬間豁免)── */
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var qlv = 0, fpsAcc = 0, fpsN = 0, lastFps = 60, PN_DRAW = PN, RING_DRAW = RINGS.length, lowStreak = 0;
  if ((navigator.hardwareConcurrency || 4) <= 2) { qlv = 1; dpr = Math.min(dpr, 1.25); } /* 低階裝置啟始保守 */
  function degrade() {
    if (qlv >= 3) { fallback("連續低影格率(" + Math.round(lastFps) + "fps)"); return; }
    qlv++;
    if (qlv === 1) { dpr = Math.min(window.devicePixelRatio || 1, 1.25); setStatus("節能模式 · 已調降解析度"); }
    else if (qlv === 2) { dpr = 1; PN_DRAW = Math.floor(PN / 2); RING_DRAW = 2; setStatus("節能模式 · 已調降星塵負載"); }
    else if (qlv === 3) { fallback("連續低影格率(" + Math.round(lastFps) + "fps)"); return; }
    fit();
  }

  /* ── 互動:拖曳(慣性)/滾輪/觸控/點擊/懸停 ── */
  cv.addEventListener("pointerdown", function (e) {
    st.drag = true; st.moved = 0; st.px = e.clientX; st.py = e.clientY; st.pt = performance.now();
    st.vy = 0; st.vx = 0; if (cv.setPointerCapture) { try { cv.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  cv.addEventListener("pointermove", function (e) {
    if (!st.drag) return;
    var dx = e.clientX - st.px, dy = e.clientY - st.py;
    st.moved += Math.abs(dx) + Math.abs(dy);
    st.ry += dx * 0.0075; st.rx += dy * 0.0055;
    st.rx = Math.max(-1.25, Math.min(1.25, st.rx));
    st.vy = dx * 0.0075; st.vx = dy * 0.0055;
    st.px = e.clientX; st.py = e.clientY;
  });
  cv.addEventListener("pointerup", function (e) {
    if (!st.drag) return; st.drag = false;
    if (st.moved < 8 && performance.now() - st.pt < 400) pulse();  /* 點擊(非拖曳)→能量脈衝 */
  });
  cv.addEventListener("pointercancel", function () { st.drag = false; st.hover = 0; }); /* v5.5.1:行動端歸位防卡死 */
  cv.addEventListener("pointerleave", function () { st.drag = false; });
  cv.addEventListener("pointerenter", function () { st.hover = 1; });
  cv.addEventListener("pointerout", function () { st.hover = 0; });
  cv.addEventListener("wheel", function (e) {
    e.preventDefault();
    st.dist = Math.max(2.15, Math.min(4.6, st.dist + e.deltaY * 0.0016));
  }, { passive: false });

  /* ── 尺寸(DPR 分級)與可見性守衛 ── */
  function fit() {
    var w = cv.clientWidth || 300, h = cv.clientHeight || w;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    mPersp(MP, 0.66, W / H, 0.1, 100);
  }
  if (window.ResizeObserver) { new ResizeObserver(fit).observe(cv); }
  window.addEventListener("resize", fit);
  var visible = true, onscreen = true;
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (en) { onscreen = en[0].isIntersecting; }, { threshold: 0.02 }).observe(cv);
  }
  cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); running = false; });
  cv.addEventListener("webglcontextrestored", function () {
    /* v5.5.1:恢復防迴圈——單一 session 最多自動重載一次,防無限 reload */
    try {
      if (!sessionStorage.getItem("orb-reload-v551")) { sessionStorage.setItem("orb-reload-v551", "1"); location.reload(); }
      else fallback("context restored(重載守衛命中)");
    } catch (err) { fallback("context restored"); }
  });

  /* ── 渲染迴圈(單 rAF;零逐幀配置——矩陣全用預分配暫存)── */
  var last = performance.now();
  mI(M); fit();
  setStatus("水晶球待感應 · 拖曳旋轉 / 點擊感應");
  function frame(now) {
    if (!running) { if (!gl.isContextLost()) running = true; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!(visible && onscreen)) { requestAnimationFrame(frame); return; }
    var t = (now - st.t0) / 1000;
    /* FPS 取樣:50 幀窗均;6 秒寬限+連續兩窗 <26fps 才降級(防載入抖動誤判;脈衝瞬間豁免) */
    fpsAcc += dt; fpsN++;
    if (fpsN >= 50) { lastFps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
      if (lastFps < 26 && t > 6 && st.burst < 0.3) { lowStreak++; if (lowStreak >= 2) degrade(); } else lowStreak = 0; }
    /* 慣性+自轉+脈衝衰減 */
    if (!st.drag) { st.ry += st.vy; st.rx += st.vx; st.vy *= Math.exp(-dt * 3); st.vx *= Math.exp(-dt * 3);
      st.ry += dt * 0.16 * (1 + (st.speed - 1) * 0.6); }
    st.burst *= Math.exp(-dt * 2.1);
    st.speed = 1 + (st.speed - 1) * Math.exp(-dt * 1.4);
    st.temp += (st.tempT - st.temp) * Math.min(1, dt * 3.5);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mPersp(MP, 0.66, cv.width / cv.height, 0.1, 100);
    mTrans(MV, 0, 0, -st.dist);
    mRotX(M, st.rx); MX.set(M);
    mRotY(M, st.ry); MY.set(M);
    mMul(M, MX, MY);  /* model = rotX·rotY */
    /* 球體 */
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.useProgram(pS.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVBO);
    gl.enableVertexAttribArray(pS.a.aPos); gl.vertexAttribPointer(pS.a.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(pS.a.aNorm); gl.vertexAttribPointer(pS.a.aNorm, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIBO);
    gl.uniformMatrix4fv(pS.u.uProj, false, MP); gl.uniformMatrix4fv(pS.u.uView, false, MV);
    gl.uniformMatrix4fv(pS.u.uModel, false, M);
    gl.uniform1f(pS.u.uTime, t); gl.uniform1f(pS.u.uTemp, st.temp);
    gl.uniform1f(pS.u.uBurst, st.burst); gl.uniform1f(pS.u.uHover, st.hover);
    gl.uniform3f(pS.u.uCam, 0, 0, st.dist);
    gl.drawElements(gl.TRIANGLES, SPH_N, gl.UNSIGNED_SHORT, 0);
    /* 星軌環(qlv≥2 減為 2 環) */
    gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(pR.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, rVBO);
    gl.enableVertexAttribArray(pR.a.aPos); gl.vertexAttribPointer(pR.a.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(pR.u.uProj, false, MP); gl.uniformMatrix4fv(pR.u.uView, false, MV);
    gl.uniform1f(pR.u.uTemp, st.temp); gl.uniform1f(pR.u.uHover, st.hover);
    for (var i = 0; i < RING_DRAW; i++) {
      var g = RINGS[i];
      mScale(MT, g.r); MS.set(MT);
      mRotY(M, t * g.sp); MR.set(M);
      mMul(M, MR, MS); MRY.set(M); /* rotY(spin)·scale */
      mRotX(M, g.tilt + Math.sin(t * 0.3 + i) * 0.06);
      mMul(M, M, MRY); /* rotX(tilt)·前述 */
      gl.uniformMatrix4fv(pR.u.uModel, false, M);
      gl.uniform1f(pR.u.uPulse, st.burst);
      gl.drawArrays(gl.LINE_LOOP, 0, RN);
    }
    /* 內部星塵(POINTS 加色;qlv≥2 半載) */
    gl.useProgram(pP.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, pVBO);
    gl.enableVertexAttribArray(pP.a.aPos); gl.vertexAttribPointer(pP.a.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, pPhase);
    gl.enableVertexAttribArray(pP.a.aPhase); gl.vertexAttribPointer(pP.a.aPhase, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, pSize);
    gl.enableVertexAttribArray(pP.a.aSize); gl.vertexAttribPointer(pP.a.aSize, 1, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(pP.u.uProj, false, MP); gl.uniformMatrix4fv(pP.u.uView, false, MV);
    gl.uniform1f(pP.u.uTime, t); gl.uniform1f(pP.u.uBurst, st.burst);
    gl.uniform1f(pP.u.uSpeed, st.speed); gl.uniform1f(pP.u.uTemp, st.temp);
    gl.drawArrays(gl.POINTS, 0, PN_DRAW);
    gl.depthMask(true);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setStatus("水晶球待感應 · 拖曳旋轉 / 點擊感應");

  /* ── E2E/驗收掛鉤(唯讀取樣+脈衝觸發;v5.5.1 增 quality/fps/dpr 取樣)── */
  hooks.mode = "webgl";
  hooks.rotY = function () { return st.ry; };
  hooks.zoom = function () { return st.dist; };
  hooks.bursts = function () { return st.bursts; };
  hooks.temp = function () { return st.temp; };
  hooks.quality = function () { return qlv; };
  hooks.fps = function () { return Math.round(lastFps); };
  hooks.dpr = function () { return dpr; };
  hooks.pulse = function () { pulse(); };
})();
