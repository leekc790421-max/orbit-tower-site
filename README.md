# Orbit Tower 行銷站（orbit-tower-site）

> 下一代企業數位總部 **AI-Powered Digital Headquarters** — 依《Growth Engine V2》規格實作的靜態多頁行銷站與 Content Engine 內容系統。

## 🔗 Links

| | |
|---|---|
| **正式站（目标）** | https://tower.xingdeng.tw　*（待 DNS：`tower` CNAME → `cname.vercel-dns.com`）* |
| **现行线上版** | https://orbit-tower.vercel.app |
| Vercel 專案 | `orbit-tower`（`prj_q2c6J0bB9XeqPDHHdFg4IYFwqARZ`，帳號 XFLS） |
| 3D 体验场（姊妹站） | https://github.com/leekc790421-max/orbit-tower |

## 📄 站點結構（17 頁）

- `/`　首頁 8 區塊（Hero／問題／解決方案／體驗／文章／報告名單／FAQ／終 CTA）
- `/articles`　20 篇路線圖 ＋ 已上線 6 篇（01–03・07–09）：裂变 50%、Lead Magnet、FAQ×7 均按 Content Engine 1.0 版式
- `/reports`　《2026 AI 數位展示館趨勢報告》名單頁
- `/diagnose`　免費網站診斷 v0（前端示意版）
- `/demo`　3D 体验场内嵌（X-Frame）
- `/orbit-tower`　樓層＝AI 部门 × 七引擎编队（Gemini/Copilot/Meta/Grok/Manus/MuleRun/QwenWork）
- `/pricing` `/faq` `/about` `/contact` `/404`
- `assets/`　`site.css` 设计系统（白底・企業藍 #2563EB・Glass UI）・`site.js`（分享／收藏 LocalStorage／表單佇列／診斷 v0／事件 track）
- `robots.txt`・`sitemap.xml`・`vercel.json`（clean URLs）＋全站 OG/Twitter Card・Article/FAQ/Organization/Breadcrumb JSON-LD

## 🚀 部署

靜態站，無建制步驟。Vercel 上以 files 上傳或本倉庫連線（建议 import 本 repo，Framework Preset: Other）。自訂網域程序：Domain 加入專案 → DNS 加 CNAME → 自動签发 SSL。

## ⚠️ v0 待接清單（於线上已可用的邊界）

1. 名單表单 → 目前收錄於訪客瀏覽器 LocalStorage 佇列；正式版接 Resend/Mailchimp（Day 0–21 培育序列）＋ CRM webhook
2. 網站診斷 → 示意分數；正式版接後端爬取＋五維评分
3. 报告 PDF 派发 → 定稿後替换
4. GA4／GTM → `site.js` 已預留 dataLayer 事件（`track()`）
5. 隱私政策／條款頁 → 上線法務檢核後補

## 🤖 被動收入閉環（v1・2026-10）

| 環節 | 機制 | 零人工狀態 | 插鑰即升級 |
|---|---|---|---|
| 流量 | 文章 pSEO＋JSON-LD＋llms.txt＋sitemap lastmod＋IndexNow（build 自動提交，Yandex/Bing/Naver） | ✅ | — |
| 名單 | /api/leads → Neon leads 表（hot/warm/cold 評分；驅動缺失降級日誌池不丟單） | ✅ `NEON_CONNECTION_STRING` 已設兩產線 | — |
| 養客 | corps?bot=seq tick：hot-48h/warm-7d/cold-30d/omo-24h 真實派工＋nurture_log 留痕；已付客自動排除 | 🟡 `awaiting-email-key`（有隊列不髮信） | `RESEND_API_KEY`+`RESEND_FROM` |
| 收款 | /api/webhook（Stripe 回調 k 閘）→入帳列＋自動收據＋DELIVERY_MAP 交付說明 | 🟡 待 `WEBHOOK_SECRET` 已設、掛 Stripe 回調址 | `PAYMENT_MODE=live`+live keys |
| 健守 | radar 每日 Cron（vercel.json）全站健檢回 ops HUD | ✅（若 files 部署未登記 cron→Dashboard 手動加一條） | — |

誠實邊界：退款爭議、對公認帳、PayPal 回調（明確 not_implemented）屬人工；稅務開票若想零人工可評估 Paddle/Lemon Squeezy 当 merchant-of-record（鉤子在 order.js provider 層）。

⚠️ 部署須知：`xingdeng.tw`（專案 xingdeng-tw-static）與 `tower.xingdeng.tw`（專案 orbit-tower-site）是同一 git 源的兩條產線，改 env 後需重新部署才快照生效；3d/ 目錄系從線上快照還原（git 歷史缺檔，2026-10-17 已並入倉庫）。

## 品牌規範（依 Growth Engine V2）

白底・企業藍 `#2563EB`・Secondary `#06B6D4`・`#F8FAFC` 區塊・`#0F172A` 文字・Glass UI。
禁止：黑底／霓虹／賽博龐克／NFT 風（深色 SNT 体验场为独立品牌轨）。
