/* 光曜星樞・全站語系基底 v2（繁中 base → EN/JA chrome 級翻譯）
   範圍：導覽列／頁尾／HUD 連結／CTA／指揮中樞共同介面元素；策略長對話與 3D 場景
   內容文字不受影響（引擎各走各的多語處理）。
   路由協定（hreflang 語意矩陣對應）：
     ?(無 hl) → zh-Hant｜?hl=en → EN chrome｜?hl=ja → JA chrome
   頁面 head 內已宣告各頁四語系 cluster（zh-Hant/en/ja/x-default，靜態為準）；
   切換器走 URL replace + reload，保證 DOM 乾淨與位址可分享。 */
(function () {
  var STORE = 'ot.lang';
  function readParam() {
    try {
      var p = new URLSearchParams(location.search).get('hl');
      if (p === 'en' || p === 'ja') return p;
      if (p === 'zh') return null;
    } catch (e) {}
    return undefined;
  }
  var L = readParam();
  if (L === undefined) { var s = localStorage.getItem(STORE); L = (/^(en|ja)$/.test(s) ? s : null); }
  else if (L) localStorage.setItem(STORE, L);
  else if (L === null) localStorage.removeItem(STORE);

  var D = {
    '首頁': { en: 'Home', ja: 'ホーム' }, '趨勢文章': { en: 'Insights', ja: 'トレンド記事' },
    '未來趨勢文章': { en: 'Future Insights', ja: 'トレンド記事' }, '研究報告': { en: 'Reports', ja: 'リサーチレポート' },
    '網站診斷': { en: 'Site Audit', ja: 'サイト診断' }, '免費網站診斷': { en: 'Free Site Audit', ja: '無料サイト診断' },
    '產品': { en: 'Product', ja: 'プロダクト' }, 'AI 數位總部': { en: 'AI Digital HQ', ja: 'AIデジタル本部' },
    '全館編制': { en: 'Departments', ja: '全館編制' }, '全館編制表': { en: 'Department Map', ja: '全館編制表' },
    '懶人包展示櫃': { en: 'Starter Kits', ja: 'スターターキット' }, '懶人包': { en: 'Kits', ja: 'キット' },
    '定價': { en: 'Pricing', ja: '料金' }, '方案與報價': { en: 'Plans & Quotes', ja: '料金プラン' },
    'FAQ': { en: 'FAQ', ja: 'よくある質問' }, '常見問題': { en: 'FAQ', ja: 'FAQ' },
    '關於': { en: 'About', ja: '会社概要' }, '品牌故事': { en: 'Our Story', ja: 'ブランドストーリー' },
    '聯繫': { en: 'Contact', ja: 'お問い合わせ' }, '聯絡業務': { en: 'Talk to Sales', ja: '営業連絡' },
    '合作提案': { en: 'Partnerships', ja: '提携提案' }, '加入我們': { en: 'Careers', ja: '採用情報' },
    '解決方案': { en: 'Solutions', ja: '解決策' }, '探索': { en: 'Discover', ja: '発見' }, '公司': { en: 'Company', ja: '会社' },
    '體驗 Orbit Tower': { en: 'Experience Orbit Tower', ja: 'Orbit Tower を体験' },
    '體驗 3D 展示館': { en: 'Enter 3D Showroom', ja: '3Dショールーム体験' },
    '免費下載 2026 趨勢報告': { en: 'Get 2026 Trend Report', ja: '2026レポート入手' },
    '《2026 AI 數位展示館趨勢報告》免費下載': { en: 'Download 2026 AI Showroom Trend Report', ja: '2026トレンドレポート無料DL' },
    '2026 趨勢報告': { en: '2026 Report', ja: '2026レポート' },
    '法律免責聲明': { en: 'Disclaimer', ja: '免責事項' }, '免責聲明': { en: 'Disclaimer', ja: '免責事項' },
    '隱私權政策': { en: 'Privacy', ja: 'プライバシー' }, '服務條款': { en: 'Terms', ja: '利用規約' },
    '返回官網': { en: '← Official Site', ja: '←公式サイト' },
    '加入 LINE 官方帳號': { en: 'Connect on LINE', ja: 'LINE公式アカウント' },
    '加入 LINE 官方帳號・AI 部門顧問': { en: 'LINE OA・AI Dept Advisor', ja: 'LINE公式・AI部門アドバイザー' },
    '💬 LINE 官方帳號': { en: '💬 LINE Official', ja: '💬 LINE公式' },
    'AI 戰略長': { en: 'Chief AI Strategist', ja: 'AI戦略長' },
    '產生報價單＋ROI 摘要': { en: 'Generate Quote + ROI', ja: '見積＋ROI生成' },
    '產生報價單': { en: 'Get a Quote', ja: '見積作成' },
    '產生報價單・預約 Demo': { en: 'Quote・Book Demo', ja: '見積・デモ予約' },
    '取得企業報價單（含 ROI）': { en: 'Enterprise Quote (ROI)', ja: '企業見積（ROI付）' },
    '𝗧 產生報價單': { en: '𝗧 Get Quote', ja: '𝗧 見積作成' },
    '把這層進駐你的企業 →': { en: 'Move this floor into your company →', ja: 'このフロアを自社に導入 →' },
    '拖曳旋轉・滾輪／雙指縮放・點擊左側樓層': { en: 'Drag to rotate・scroll/pinch to zoom・tap a floor', ja: 'ドラッグで回転・ホイールで拡大・階数をクリック' },
    'AI Core Online・24/7': { en: 'AI Core Online・24/7', ja: 'AIコア稼働中・24/7' },
    '行銷站｜未來趨勢文章': { en: 'Official Site・Future Insights', ja: '公式サイト・トレンド記事' },
    '預約導覽 Demo': { en: 'Book a Guided Demo', ja: 'デモ予約' },
    '光曜星樞官網｜行銷站': { en: 'SNT Official Site', ja: '光曜星樞公式サイト' },
    '線上報價單・沙箱金流': { en: 'Online Quote・Sandbox Pay', ja: 'オンライン見積・サンドボックス決済' },
    '拾光引 SNT｜命理雙域站': { en: 'LumiGuide SNT｜Destiny Suite', ja: '拾光引 SNT｜命理ツインサイト' },
    '拾光引 SNT・命理雙域站': { en: 'LumiGuide SNT・Destiny Suite', ja: '拾光引 SNT・命理ツインサイト' },
    '拾光引 LumiGuide': { en: 'LumiGuide', ja: '拾光引 LumiGuide' },
    '拾光引 VIP 體驗': { en: 'LumiGuide VIP Trial', ja: '拾光引 VIP体験' },
    '拾光引 VIP': { en: 'LumiGuide VIP', ja: '拾光引 VIP' },
    'Orbit Tower 3D 總部': { en: 'Orbit Tower 3D HQ', ja: 'Orbit Tower 3D本社' },
    '產生商業報價單＋沙箱定金 →': { en: 'Business Quote + Sandbox Deposit →', ja: '商用見積＋保証金（SANDBOX） →' },
    '延伸閱讀・從 AI 戰略長開始': { en: 'Further Reading・Start with the AI Strategist', ja: '関連記事・AI戦略長から' },
    '雙星互鏈：': { en: 'Twin-site network:', ja: 'ツインサイト：' },
    'SNT 集團直達': { en: 'SNT Group Direct', ja: 'SNTグループ直通' },
    '拾光引・命理雙域站 ↗': { en: 'LumiGuide・Destiny Suite ↗', ja: '拾光引・命理ツインサイト ↗' },
    '拾光引 VIP ↗': { en: 'LumiGuide VIP ↗', ja: '拾光引 VIP ↗' },
    '線上報價單': { en: 'Online Quote', ja: 'オンライン見積' },
    '命理雙域站・拾光引': { en: 'Destiny Suite・LumiGuide', ja: '命理ツインサイト・拾光引' },
    'AI 崗位': { en: 'AI Roles', ja: 'AIポジション' }, '進駐引擎': { en: 'Deployed Engines', ja: '導入エンジン' },
    '官網': { en: 'Site', ja: '公式サイト' }, '3D 總部': { en: '3D HQ', ja: '3D本社' }, '報價單': { en: 'Quote', ja: '見積' },
    '光曜 Orbit Tower｜3D 數位總部 →': { en: 'Orbit Tower｜3D Digital HQ →', ja: 'Orbit Tower｜3Dデジタル本部 →' },
    '官網｜xingdeng.tw': { en: 'Official｜xingdeng.tw', ja: '公式サイト｜xingdeng.tw' },
    '光曜星樞官網｜xingdeng.tw': { en: 'SNT Official｜xingdeng.tw', ja: '光曜星樞公式サイト｜xingdeng.tw' },
    '電子名片': { en: 'Digital Business Card', ja: '電子名刺' },
    '光曜星樞 官網': { en: 'SNT Official Site', ja: '光曜星樞公式サイト' },
    '回報價工具': { en: 'Quote Tool', ja: '見積ツール' }, '人工諮詢': { en: 'Talk to a Human', ja: '人工相談' },
    '收單台（本機）': { en: 'Leads Console (local)', ja: 'リードコンソール（ローカル）' },
    '匯出 JSON': { en: 'Export JSON', ja: 'JSON出力' }, '匯出 CSV': { en: 'Export CSV', ja: 'CSV出力' },
    '清空（連按兩次確認）': { en: 'Clear (double-click to confirm)', ja: 'クリア（2回クリックで確定）' },
  };
  var PREFIX = /^[\u2197\u2196\u2196\u26a1\ud83e\uddfe\ud83c\udf05\u2728\ud83d\udcb3\ud83d\udcbc\ud83d\udef0\ud83d\udce5\ud83d\udcda\ud83d\udc64\u2b50\ud83c\udfe2\ud83d\ude80\ud83d\udd2c\ud83e\udded\ud83d\udc4b\ud83d\udcc5\ud83e\udd16\ud83d\udebb\ud83c\udfc5\ud83d\udca1\ud83d\udd17\ud83d\udcdd\ud83d\udee0\ufe0f\u2705\u2795\u2705]+/u;
  function strip(t) { return t.replace(PREFIX, '').replace(/\s+$/, '').replace(/^[•·]+\s*/, ''); }
  function tr(txt) {
    var k = txt.trim();
    var e = D[k] || D[strip(k)] || null;
    return e ? (e[L] || null) : null;
  }
  function walk(root) {
    if (!root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n, hits = [];
    while ((n = w.nextNode())) {
      var t = n.nodeValue; if (!t || !t.trim()) continue;
      if (n.parentNode && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentNode.tagName)) continue;
      var m = tr(t); if (m) hits.push([n, m]);
    }
    hits.forEach(function (h) { h[0].nodeValue = h[1]; });
  }
  function applyLangAttr() {
    document.documentElement.setAttribute('lang', L === 'en' ? 'en' : L === 'ja' ? 'ja' : 'zh-Hant');
  }
  function apply() {
    applyLangAttr();
    ['nav', 'footer', '.ui.navlinks', '.hero, header.ui.top', '#floorCard .cta', '#floorCard .k', '#floorCard .tags', '#cBoostWrap .k', '.dc-actions', '#btns', 'h1', '.sub'].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { walk(el); });
    });
    markButtons();
  }
  function navTo(lang) {
    var u = new URL(location.href);
    if (!lang) { localStorage.removeItem(STORE); u.searchParams.delete('hl'); }
    else { localStorage.setItem(STORE, lang); u.searchParams.set('hl', lang); }
    location.href = u.toString();
  }
  function groupStyle(dark) {
    return 'display:flex;gap:2px;margin-left:6px;padding:2px;border-radius:99px;background:' + (dark ? 'rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.3)' : '#F1F5F9;border:1px solid #E2E8F0');
  }
  function buildGroup(dark) {
    var group = document.createElement('div');
    group.style.cssText = groupStyle(dark); group.className = 'lang-switch';
    [['zh', '繁中'], ['en', 'EN'], ['ja', '日']].forEach(function (o) {
      var on = (o[0] === 'zh' ? !L : L === o[0]);
      var b = document.createElement('button'); b.textContent = o[1];
      b.setAttribute('aria-label', 'switch language ' + o[0]);
      b.setAttribute('data-lang', o[0]);
      b.style.cssText = 'border:0;border-radius:99px;padding:5px 10px;font:600 12px/1 inherit;cursor:pointer;background:' + (on ? (dark ? '#D4AF37' : '#2563EB') : 'transparent') + ';color:' + (on ? (dark ? '#0B1220' : '#fff') : (dark ? '#c8cdd8' : '#475569'));
      b.onclick = function () { navTo(o[0] === 'zh' ? null : o[0]); };
      group.appendChild(b);
    });
    return group;
  }
  function markButtons() {
    document.querySelectorAll('.lang-switch').forEach(function (g) {
      var dark = /rgba\(212,175,55/.test(g.style.background || g.style.cssText);
      g.querySelectorAll('button').forEach(function (b) {
        var o = b.getAttribute('data-lang'); var on = (o === 'zh' ? !L : L === o);
        b.style.background = on ? (dark ? '#D4AF37' : '#2563EB') : 'transparent';
        b.style.color = on ? (dark ? '#0B1220' : '#fff') : (dark ? '#c8cdd8' : '#475569');
      });
    });
  }
  function mount() {
    var holder = document.querySelector('nav .nav__links') || document.querySelector('nav .nav__in');
    var dark = false;
    if (holder) { if (holder.querySelector('.lang-switch')) return; holder.appendChild(buildGroup(false)); return; }
    holder = document.querySelector('header.ui.top') || document.querySelector('.ui.navlinks');
    if (holder) {
      if (holder.querySelector('.lang-switch')) return;
      var g = buildGroup(true); g.style.marginLeft = 'auto'; holder.appendChild(g); return;
    }
    if (document.querySelector('.lang-switch--float')) return;
    var fl = buildGroup(true); fl.className += ' lang-switch--float';
    fl.style.cssText = groupStyle(true) + ';position:fixed;top:10px;right:10px;z-index:9999;margin:0;box-shadow:0 4px 14px rgba(0,0,0,.35)';
    document.body.appendChild(fl);
  }
  window.Sntl10n = { apply: apply, mount: mount, dict: D, nav: navTo, get lang() { return L || 'zh'; } };
  var boot = function () { mount(); if (L) apply(); else markButtons(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
