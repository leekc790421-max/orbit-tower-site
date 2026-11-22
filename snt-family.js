/* 光曦星樞 SNT — 全站家族識別帶（v2：依 PPC 企劃書 ② 的分組與主打順序）
 *
 * 目的：讓訪客一眼看出「這是一家公司的五種服務」，並依業務屬性分區，
 *       而不是五個入口平鋪、互相稀釋。
 *
 * 分組邏輯（企劃書 ②）：
 *   主打     vip        命理／VIP —— 唯一有完整自助漏斗（免費起卦 → 方案 → 下單）
 *   AI 建站  xingdeng → tower → orbit   同一條 B2B 決策鏈，必須相鄰
 *   獨立     decoration 中部裝修木作 —— 客群完全不同，獨立分區
 *
 * 用法：<script src="/snt-family.js" defer></script>（放 </body> 前）
 * 設計原則：只做加法，不改任何既有頁面邏輯；載入失敗不影響頁面。
 */
(function () {
  if (window.__SNT_FAMILY__) return;
  window.__SNT_FAMILY__ = true;

  var GROUPS = [
    {
      key: 'primary',
      label: '主打',
      note: '免費起卦，30 秒出結果',
      sites: [
        { key: 'vip', name: '光曦星匯 VIP', desc: '五色水晶球・命理測算', url: 'https://vip.xingdeng.tw' }
      ]
    },
    {
      key: 'ai',
      label: 'AI 數位總部與建站',
      note: '從官網到 3D 展示，一條決策鏈',
      sites: [
        { key: 'main', name: '光曦星樞', desc: '企業 AI 數位總部', url: 'https://xingdeng.tw' },
        { key: 'tower', name: '光曦星軌', desc: '架網懶人包 NT$1,980 起', url: 'https://tower.xingdeng.tw' },
        { key: 'orbit', name: '光曦星環', desc: '3D 品牌展示館', url: 'https://orbit.xingdeng.tw' }
      ]
    },
    {
      key: 'deco',
      label: '中部精裝修木作',
      note: '台中・彰化・南投現場丈量',
      sites: [
        { key: 'decoration', name: '光曦星閣', desc: '天花板・隔間・櫃體・木地板', url: 'https://decoration.xingdeng.tw' }
      ]
    }
  ];

  var here = location.hostname;
  var current = 'main';
  if (here.indexOf('tower.') === 0) current = 'tower';
  else if (here.indexOf('orbit.') === 0) current = 'orbit';
  else if (here.indexOf('vip.') === 0) current = 'vip';
  else if (here.indexOf('decoration.') === 0) current = 'decoration';

  var css = ''
    + '.sntfam{--snt-ink:#141a1f;--snt-line:#e2e0d9;--snt-amber:#b4762a;'
    + 'font-family:"Noto Sans TC",system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;'
    + 'background:#f4f1ea;border-top:1px solid var(--snt-line);padding:26px 20px 30px;color:var(--snt-ink);'
    + 'font-size:13.5px;line-height:1.7;text-align:left}'
    + '.sntfam__in{max-width:1080px;margin:0 auto}'
    + '.sntfam__hd{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:16px}'
    + '.sntfam__hd b{font-size:14.5px;letter-spacing:.02em}'
    + '.sntfam__hd span{color:#5d6b76;font-size:12.5px}'
    + '.sntfam__grp{margin-bottom:14px}'
    + '.sntfam__gl{display:flex;align-items:baseline;gap:8px;margin-bottom:7px;flex-wrap:wrap}'
    + '.sntfam__gl b{font-size:11px;letter-spacing:.14em;color:#b4762a;font-weight:800}'
    + '.sntfam__gl i{font-style:normal;font-size:11.5px;color:#8a97a1}'
    + '.sntfam__grid{display:grid;gap:8px}'
    + '.sntfam__grid--1{grid-template-columns:1fr}'
    + '.sntfam__grid--3{grid-template-columns:repeat(3,1fr)}'
    + '@media(max-width:820px){.sntfam__grid--3{grid-template-columns:1fr}}'
    + '.sntfam__a{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid var(--snt-line);'
    + 'border-radius:10px;padding:11px 13px;transition:.16s}'
    + '.sntfam__a:hover{border-color:var(--snt-amber);transform:translateY(-1px)}'
    + '.sntfam__a b{display:block;font-size:13.5px;font-weight:800;margin-bottom:2px}'
    + '.sntfam__a i{display:block;font-style:normal;font-size:11.5px;color:#5d6b76}'
    + '.sntfam__a.on{background:var(--snt-ink);border-color:var(--snt-ink)}'
    + '.sntfam__a.on b{color:#fff}.sntfam__a.on i{color:#c9c3b6}'
    + '.sntfam__a--hero{padding:15px 17px;border-color:#b4762a55;background:linear-gradient(180deg,#fffdf8,#fff)}'
    + '.sntfam__a--hero b{font-size:15px}'
    + '.sntfam__ft{margin-top:16px;padding-top:14px;border-top:1px solid var(--snt-line);font-size:12px;color:#5d6b76;display:flex;gap:16px;flex-wrap:wrap}'
    + '.sntfam__ft a{color:#b4762a;text-decoration:none}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function cell(s, hero) {
    var on = s.key === current ? ' on' : '';
    var label = s.key === current ? s.desc + '（你在這裡）' : s.desc;
    return '<a class="sntfam__a' + (hero ? ' sntfam__a--hero' : '') + on + '" href="' + s.url + '">'
      + '<b>' + s.name + '</b><i>' + label + '</i></a>';
  }

  var groupsHtml = GROUPS.map(function (g) {
    var cols = g.sites.length === 1 ? '1' : '3';
    var hero = g.key === 'primary';
    return '<div class="sntfam__grp">'
      + '<div class="sntfam__gl"><b>' + g.label + '</b><i>' + g.note + '</i></div>'
      + '<div class="sntfam__grid sntfam__grid--' + cols + '">'
      + g.sites.map(function (s) { return cell(s, hero); }).join('')
      + '</div></div>';
  }).join('');

  var box = document.createElement('div');
  box.className = 'sntfam';
  box.innerHTML = ''
    + '<div class="sntfam__in">'
    + '<div class="sntfam__hd"><b>光曦星樞 SNT</b>'
    + '<span>同一家公司，五種服務。你現在看的是其中一種，其他四種在這裡。</span></div>'
    + groupsHtml
    + '<div class="sntfam__ft">'
    + '<span>台中在地團隊</span>'
    + '<a href="https://line.me/R/ti/p/@580ctuew" target="_blank" rel="noopener">LINE @580ctuew</a>'
    + '<a href="mailto:service@xingdeng.tw">service@xingdeng.tw</a>'
    + '<span>週一至週五 09:00–18:00</span>'
    + '</div></div>';

  function mount() {
    var f = document.querySelector('footer');
    if (f && f.parentNode) f.parentNode.insertBefore(box, f.nextSibling);
    else document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
