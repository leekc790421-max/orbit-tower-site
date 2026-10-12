Orbit Tower 網站部署包（靜態站・Growth Engine V2 規格實作）
─────────────────────────────────────────────
內容
  index.html                 首頁（8 區塊：Hero／問題／解決方案／體驗／文章／報告／FAQ／終 CTA）
  articles/                  趨勢文章列表 + 已上線 6 篇（a01 a02 a03 a07 a08 a09）
  reports/                   《2026 AI 數位展示館趨勢報告》名單頁
  diagnose/                  免費網站診斷 v0（前端示意版，正式版接後端爬取 API）
  demo/                      體驗入口（內嵌 orbit.xingdeng.tw 3D 晶体塔）
  orbit-tower/ pricing/ faq/ about/ contact/ 404.html
  assets/                    site.css 設計系統・site.js 互動（分享/收藏/表單佇列/診斷 v0）
  robots.txt sitemap.xml vercel.json

部署（Vercel）
  1. 將本資料夾上傳至 Vercel 專案根目錄（同你之前的 SNT 部署包流程）。
  2. 若網域不是 orbit.xingdeng.tw：全域搜尋替換該字串
     （出現在 canonical、og:url、sitemap、JSON-LD、LINE/LinkedIn 分享連結）。

上線前待接（目前為靜態規格實作）
  ・名單表單：site.js 以 localStorage 佇列收單 → 建議接 Resend／Mailchimp（Email Engine Day0-21）＋CRM webhook
  ・診斷 v0：固定示意分數 → 正視版需後端爬取＋五維評分（規格見企劃書 PART 07）
  ・GA4／GTM：head 內留 dataLayer 鉤子，站點事件已在 site.js track() 輸出
  ・《2026 報告》PDF：reports 頁 download 按鈕目前導表單，PDF 定稿後替換
  ・隱私政策／服務條款頁面與金流（僅使用合法支付管道，規範見企劃書 DECISION #B）

品牌規範（依 Growth Engine V2）
  白底・企業藍 #2563EB・Secondary #06B6D4・文字 #0F172A・區塊 #F8FAFC・Glass UI
  禁止：黑底／霓虹／賽博龐克／NFT 風（深色 SNT 體驗場為獨立 DECISION #A 議題）
