/* SNT Starter Kit・前端核心：i18n＋授權信標＋免責頁腳防拆（行為皆揭露於 EULA） */
(function(){
'use strict';
var LANGS={
 zh:{"nav.about":"關於","nav.services":"服務","nav.pricing":"定價","nav.contact":"聯絡","hero.k":"YOUR BUSINESS・UPGRADED","hero.t":"把顧客帶進你的品牌空間","hero.d":"由 SNT 一鍵架網懶人包驅動：AI 接待READY、多語就緒、行動響應。","cta.demo":"預約體驗","cta.line":"LINE 諮詢","sec.svc":"我們提供","sec.why":"為什麼選我們","sec.contact":"聯絡我們","pay.t":"匯款／付款資訊","pay.d":"預設收款：樂天國際商業銀行","foot.disc":"法律免責聲明","foot.by":"本網站由 SNT 光曜星樞驅動"},
 en:{"nav.about":"About","nav.services":"Services","nav.pricing":"Pricing","nav.contact":"Contact","hero.k":"YOUR BUSINESS・UPGRADED","hero.t":"Bring customers into your brand space","hero.d":"Powered by the SNT starter kit: AI reception ready, multilingual, fully responsive.","cta.demo":"Book a demo","cta.line":"Chat on LINE","sec.svc":"What we offer","sec.why":"Why us","sec.contact":"Contact us","pay.t":"Payment","pay.d":"Default account: Rakuten Intl Bank","foot.disc":"Legal Disclaimer","foot.by":"Powered by SNT Orbit Tower"},
 ja:{"nav.about":"概略","nav.services":"サービス","nav.pricing":"料金","nav.contact":"お問い合わせ","hero.k":"あなたのビジネス・アップデート","hero.t":"顧客をブランド空間へご案內","hero.d":"SNTスターターキット搭載：AIレセプション、多言語、レスポンシブ対応。","cta.demo":"デモ予約","cta.line":"LINE相談","sec.svc":"サービス內容","sec.why":"選ばれる理由","sec.contact":"お問い合わせ","pay.t":"お支払い","pay.d":"標準口座：楽天國際銀行","foot.disc":"法律上の免責事項","foot.by":"SNTが技術提供"},
 ko:{"nav.about":"소개","nav.services":"서비스","nav.pricing":"요금","nav.contact":"연락처","hero.k":"비즈니스 업그레이드","hero.t":"고객을 브랜드 공간으로","hero.d":"SNT 스타터 키트: AI 리셉션, 다국어, 반응형 기본.", "cta.demo":"데모 예약","cta.line":"LINE 상담","sec.svc":"서비스","sec.why":"선택 이유","sec.contact":"연락처","pay.t":"결제 정보","pay.d":"기본 계좌:樂天國際銀行".replace('樂天國際銀行','라쿠텐 국제은행'),"foot.disc":"법적 고지","foot.by":"SNT가 기술 제공"},
 th:{"nav.about":"เกี่ยวกับเรา","nav.services":"บริการ","nav.pricing":"ราคา","nav.contact":"ติดต่อ","hero.k":"ธุรกิจของคุณ・อัปเกรดแล้ว","hero.t":"พา ลูกค้าเข้าสู่พื้นที่แบรนด์ของคุณ","hero.d":"ขับเคลื่อนด้วย SNT Starter Kit: AI บริการลูกค้า หลายภาษา รองรับทุกหน้าจอ","cta.demo":"จองเดโม","cta.line":"คุยผ่าน LINE","sec.svc":"บริการของเรา","sec.why":"ทำไมต้องเรา","sec.contact":"ติดต่อเรา","pay.t":"ข้อมูลการชำระเงิน","pay.d":"บัญชีหลัก: Rakuten Intl Bank","foot.disc":"ข้อจำกัดความรับผิดชอบทางกฎหมาย","foot.by":"สร้างโดย SNT"},
 vi:{"nav.about":"Giới thiệu","nav.services":"Dịch vụ","nav.pricing":"Giá","nav.contact":"Liên hệ","hero.k":"NÂNG TẦM DOANH NGHIỆP","hero.t":"Đưa khách hàng vào không gian thương hiệu","hero.d":"Vận hành bởi SNT Starter Kit: trực AI, đa ngôn ngữ, responsive.","cta.demo":"Đặt lịch demo","cta.line":"Nhắn LINE","sec.svc":"Dịch vụ của chúng tôi","sec.why":"Vì sao chọn chúng tôi","sec.contact":"Liên hệ","pay.t":"Thông tin thanh toán","pay.d":"Tài khoản mặc định: Rakuten Intl Bank","foot.disc":"Tuyên bố miễn trừ trách nhiệm","foot.by":"Powered by SNT"},
 id:{"nav.about":"Tentang","nav.services":"Layanan","nav.pricing":"Harga","nav.contact":"Kontak","hero.k":"BISNISMU・DIPERBARUI","hero.t":"Bawa pelanggan ke ruang merek Anda","hero.d":"Didukung SNT Starter Kit: resepsi AI, multi bahasa, responsif.","cta.demo":"Jadwalkan demo","cta.line":"Chat LINE","sec.svc":"Layanan kami","sec.why":"Kenapa kami","sec.contact":"Hubungi kami","pay.t":"Informasi pembayaran","pay.d":"Rekening default: Rakuten Intl Bank","foot.disc":"Sanggahan hukum","foot.by":"Ditenagai oleh SNT"}
};
var ORDER=['zh','en','ja','ko','th','vi','id'];
var html=document.documentElement;
var saved=localStorage.getItem('snt.lang');
var lang=saved||html.getAttribute('data-lang')||'zh';
function apply(l){
  lang=l; html.lang=l==='zh'?'zh-Hant':l;
  var d=LANGS[l]||LANGS.zh;
  document.querySelectorAll('[data-i18n]').forEach(function(el){ if(d[el.getAttribute('data-i18n')]) el.textContent=d[el.getAttribute('data-i18n')]; });
  var sel=document.getElementById('langSel'); if(sel) sel.value=l;
  localStorage.setItem('snt.lang',l);
}
// 語言選單注入
var holder=document.getElementById('langbar');
if(holder){
  var s='<select id="langSel" aria-label="language">'+ORDER.map(function(k){return '<option value="'+k+'">'+({zh:'繁中',en:'EN',ja:'日本語',ko:'한국어',th:'ไทย',vi:'Tiếng Việt',id:'Indonesia'})[k]+'</option>';}).join('')+'</select>';
  holder.innerHTML=s;
  holder.onchange=function(){apply(document.getElementById('langSel').value);};
}
html.setAttribute('data-lang',lang);
apply(lang);
// —— 授權信標（揭露於 EULA §5）：每日一次，僅送雜湊ID＋網域＋時間戳 ——
(function(){
  var lic = location.hostname;
  var key='snt.beacon';
  try{
    var last=localStorage.getItem(key)||'';
    var today=new Date().toISOString().slice(0,10);
    if(last!==today && /{{API}}|snt-line-bot/.test('https://snt-line-bot.vercel.app')){
      var el=document.querySelector('meta[name="x-snt-kid"]');
      var kid=el?el.content:'';
      fetch('https://snt-line-bot.vercel.app/api/activate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kid:kid,domain:lic,ts:new Date().toISOString(),ev:'view'})}).catch(function(){});
      localStorage.setItem(key,today);
    }
  }catch(e){}
})();
(function(){
  var anchor=document.querySelector('footer.site')||document.body;
  var el=document.getElementById('legal-footer');
  var snapshot=el?el.outerHTML:'';
  if(snapshot && window.MutationObserver){
    new MutationObserver(function(){
      if(!document.getElementById('legal-footer')) anchor.insertAdjacentHTML('beforeend',snapshot);
    }).observe(anchor,{childList:true,subtree:true});
  }
  ['contextmenu'].forEach(function(ev){document.addEventListener(ev,function(e){e.preventDefault();});});
  document.addEventListener('keydown',function(e){ if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&e.key.length===1&&'ijIJ'.indexOf(e.key)>-1)) e.preventDefault(); });
})();

})();
