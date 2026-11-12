# SNT 版本變更紀錄 (CHANGELOG)

> 依 SNT-DEPLOY-001 規範,每次版本發布必須產出正式變更紀錄。
> 版本號格式:v5.主版號.修正號,禁止使用 latest 直接覆蓋。
> 當企劃與創辦人決策衝突,以 Founder Approved Override 為準。
> 本檔位於 tower repo 內,公開核驗 URL:https://tower.xingdeng.tw/governance/CHANGELOG.md

---

## v5.3.3 · 2026-11-12 · P3-R3 Manus FAIL Fix R2

### 變更摘要

Manus 獨立覆核 P2/P3 判定 FAIL,指出三項核心缺失(404 路由、定價一致、合規證據)。v5.3.2 第一輪修復未竟全功,本版為第二輪緊急修復,補齊公開核驗證據。

### 修復項目

| # | 缺失 | 根因 | 修復 |
|---|---|---|---|
| 1 | 404 路由錯誤 | 實際頁在 /builder/*,但 /products、/setup、/version、/warranty 頂層別名未建立 | vercel.json 新增 redirects,/products→/builder/packages、/products/t1|t2|t3→/builder/packages/t1|t2|t3、/setup→/builder/setup、/version→/builder/version、/warranty→/builder/warranty |
| 2 | /kits T2 卡片價格矛盾 | v5.3.2 已修(24,800→13,900),但 /builder/version 頁停滯 v5.2.0,版本證據不一致削弱可信度 | 版本頁同步至 v5.3.3;線上實測 /kits、/builder/packages/t2 三處皆 NT$13,900 |
| 3 | SNT-DEPLOY-001 合規證據不足 | governance/ 與 backups/ 在工作區非 repo,外部無法核驗;無 git tag | governance/ 目錄入 repo(CHANGELOG + deploy-log + backup-manifest.sha256 公開可訪);git tag v5.3.3 推送 GitHub;/builder/version 同步 v5.3.3 |

### 修改檔案

| 路徑 | 變更 |
|---|---|
| `vercel.json` | 新增 redirects 區塊(5 條頂層別名導向) |
| `VERSION` | v5.3.2 → v5.3.3 |
| `builder/version/index.html` | v5.2.0 → v5.3.3(標題/meta/og/jsonld/h1/歷史表/變更區/頁尾全同步)+ 新增公開核驗證據區 |
| `compliance/index.html` | v5.3.2 → v5.3.3;填實 v5.3.2 部署紀錄(commit 35d0ac5 / dpl_7y3TWBqf);新增 v5.3.3 列;重寫備份核驗為三層(公開 manifest / git tag / 物理快照);新增公開核驗連結區 |
| `paths.txt` | 補齊 /builder/* /verification /compliance 等 v5.2/v5.3 新路徑 |

### 新建檔案

| 路徑 | 用途 |
|---|---|
| `governance/CHANGELOG.md` | 變更紀錄(本檔,公開可訪) |
| `governance/deploy-log.md` | 部署紀錄(公開可訪) |
| `governance/backup-manifest.sha256` | 所有 HTML/CSS/JS/JSON 之 SHA-256 完整性 manifest(公開可訪) |

### 公開核驗證據

- 版本編號:v5.3.3(/VERSION、/builder/version、/compliance 三處一致)
- git tag:https://github.com/leekc790421-max/orbit-tower-site/releases/tag/v5.3.3(不可變)
- SHA-256 manifest:/governance/backup-manifest.sha256(本 repo 公開)
- 部署紀錄:/governance/deploy-log.md
- Preview 實證:https://orbit-tower-site-2keqmizmz-xfls.vercel.app

### 部署狀態

部署至 Preview,未進 Production。等 Manus 複查 PASS。

---

## v5.4.0 · 2026-11-11 · P4 Orbit Productization ⛔ 凍結中

> **凍結聲明(2026-11-12)**:依 GEMINI-ORDER-FIX-FAIL,Manus 判定 P2/P3 為 FAIL。
> 在 P2/P3 取得 PASS 結案認可前,嚴禁推進 P4。本版內容已落檔但禁止部署與推進。

### 變更摘要(凍結前已完成)

光曦星軌(orbit.xingdeng.tw)從 3D 展示站升級為企業數位總部產品站。建立企業方案、租賃方案、報價入口三大模組。

### 企業方案定價(人工評估後報價)

| 方案 | NT$ | 適合 |
|---|---|---|
| Orbit Foundation | NT$228,000 起 | 個人品牌、工作室、新創 |
| Orbit Growth | NT$498,000 起 | B2B 企業、製造業 |
| Orbit Enterprise | NT$798,000 起 | 跨國企業、集團 |

### 租賃方案定價

| 方案 | 價格 | 最短 | 內容 |
|---|---|---|---|
| 月租 | NT$18,800/月 | 3 個月 | 展示+主機+每月更新1次 |
| 年租 | NT$188,000/年 | 12 個月 | 月租全部+進階SEO+多語 |

### 部署狀態

⛔ 凍結。Preview 已建立但禁止推進,等 P2/P3 PASS 後解凍。

---

## v5.3.2 · 2026-11-11 · P3-R2 Manus FAIL Fix R1

### 變更摘要

Manus 獨立覆核 P2/P3 判定 FAIL,指出三項核心缺失。本版為第一輪修復(後續 v5.3.3 補齊證據層)。

### 修復項目

| # | 缺失 | 修復 |
|---|---|---|
| 1 | 404 路由錯誤 | 確認 11 頁全 HTTP 200(builder/demo/readme/setup/version/sha256/warranty/packages/t1/t2/t3/verification)——未處理頂層別名(v5.3.3 補) |
| 2 | /kits 頁 T2 卡片價格矛盾 | T2 卡片 NT$24,800 → NT$13,900(與比較表、T2 產品頁一致) |
| 3 | SNT-DEPLOY-001 合規證據不足 | 建立 /VERSION 檔 + /compliance 頁(但 governance/ 與 backups/ 未入 repo,v5.3.3 補) |

### 修改檔案

| 路徑 | 變更 |
|---|---|
| `kits/index.html` | T2 卡片價格 NT$24,800 → NT$13,900 |
| `VERSION` | 建立(v5.3.2) |
| `compliance/index.html` | 建立(版本/備份/部署紀錄/回滾 ID) |

### 部署狀態

部署至 Preview(commit 35d0ac5,dpl_7y3TWBqf)。Manus 覆核仍 FAIL → 觸發 v5.3.3。

---

## v5.3.1 · 2026-11-11 · P3-R1 Verification Recovery

### 變更摘要

Manus 覆核 P3 時發現 Preview 受 Vercel SSO 保護,匿名驗收阻塞。建立驗收環境與驗收包。

### 新建檔案

| 路徑 | 用途 |
|---|---|
| `/verification/index.html` | 驗收報告頁(路由/HTTP/Title/Description/Canonical/JSON-LD/截圖) |
| `/verification/verification-data.json` | 11 頁驗收資料(JSON) |
| `/verification/screenshots/*.png` | 11 張驗收截圖 |

### 部署狀態

部署至 Preview(commit 2e774291,dpl_7Lbdar6N)。

---

## v5.3.0 · 2026-11-11 · P3 Tower Productization

### 變更摘要

Tower 從展示站升級為可成交產品站。建立 Products 專區與三方案產品頁(Content Productization,非 Commerce Automation)。

### 新建檔案

| 路徑 | 用途 |
|---|---|
| `/builder/packages/index.html` | Products 產品專區入口 |
| `/builder/packages/t1/index.html` | T1 創業版 NT$7,800 產品頁 |
| `/builder/packages/t2/index.html` | T2 商務版 NT$13,900 產品頁 |
| `/builder/packages/t3/index.html` | T3 企業版 NT$24,800 產品頁 |

### 定價(Founder Approved Override)

T1 NT$7,800 / T2 NT$13,900 / T3 NT$24,800(一次性買斷)。

### 部署狀態

部署至 Preview(commit f415c51d,dpl_BHpW1Y4U)。

---

## v5.2.0 · 2026-11-11 · P2 Tower Builder Foundation

### 變更摘要

建立光曦星閣 Tower Builder `/builder` 目錄與七大區塊骨架。

### 新建檔案

| 路徑 | 用途 |
|---|---|
| `/builder/index.html` | Builder 首頁 |
| `/builder/demo/index.html` | Demo 區 |
| `/builder/readme/index.html` | README |
| `/builder/setup/index.html` | Setup Guide |
| `/builder/version/index.html` | Version 區(原標 v5.2.0,v5.3.3 同步) |
| `/builder/sha256/index.html` | SHA-256 驗證說明頁 |
| `/builder/warranty/index.html` | 保固說明頁 |

### 部署狀態

部署至 Preview(commit 5ef885de,dpl_BThb5MLw)。

---

## v5.1.0 · 2026-11-11 · P1 Brand Alignment 四站品牌一致化

### 變更摘要

四站品牌名稱全面統一。施工範圍:115 檔 690 處。

| 站 | 修改檔案數 | 修改項目數 |
|---|---|---|
| xingdeng | 16 | 72 |
| tower | 55 | 424 |
| orbit | 24 | 138 |
| vip | 20 | 56 |
| **合計** | **115** | **690** |

### 清除項目

光曜星樞/光曜星棧/光曜星閣/光曜星軌/光曜星匯 → 光曦星樞/光曦星閣/光曦星軌/光曦星匯。CosmoSphere / Orbit Tower 殘留清除。

### 部署狀態

部署至 Preview(commit abaff06a,dpl_5EZKV9Hy)。

---

## v5.0.1 · 2026-11-11 · Phase 0 文案清洗 + 品牌一致化

### Founder Approved Override(品牌與定價定案)

**品牌名稱(正式定案):**
- xingdeng.tw = 光曦星樞
- tower.xingdeng.tw = 光曦星閣
- orbit.xingdeng.tw = 光曦星軌
- vip.xingdeng.tw = 光曦星匯

**定價(Founder Approved Pricing):**
- 光曦星閣(Tower):T1 NT$7,800 / T2 NT$13,900 / T3 NT$24,800
- 光曦星匯(VIP):維持 US$688 / US$2,888 / US$6,888 席位體系

### 本次變更

Phase 0 總站文案清洗:移除「主動接待」「24 小時接客」「30 秒內回覆」「轉換率翻 3 倍」「省下 80%」等違規文案,改為「客戶主動開啟、系統被動回應、人工確認」。

### 部署狀態

部署至 Preview。

---

## v5.0.0 · 2026-11-10 · Step 0 凍結 + 改造創新企劃定稿

### 變更內容

- Step 0 凍結模式啟動:Growth Engine 凍結、isRoot 直通停用、第 001 期電子報下架
- Z.AI cron 改草稿模式(Job 521129 晨訊、Job 521133 Threads)
- 四站 production 備份(含 SHA-256):backups/production-2026-11-10/
- 紅線檢查腳本建立(scripts/redline_check.py)

### 部署狀態

四站部署至 Production(commit 6cf314c9 等,dpl_BKEeZnW8 等)。此為現行 Production 版本,未變更。

---

## 鐵律傳承(v4 → v5 不變)

- SNT-DEPLOY-001 部署禁令:嚴禁直接修改 Production
- 四站物理級隔離:VIP 與 Tower 路由分離,不共享,不交叉行銷
- AI 接待標示:客戶主動開啟、系統被動回應、無背景監控、無自動扣款
- SHA-256 驗證流程
- L1 + L2 + L3 三級品管
- 版本編號規則:禁止 latest 覆蓋
- 回滾規則
- 緊急停用條件

### 部署流程(SNT-DEPLOY-001)

```
Workspace → L1(紅線) → Preview → L2(Manus 覆核) → L3(總裁簽核) → Production
```

### 文件地位

- v4 = Baseline
- v5 完整版 = Baseline Extension
- v5 改造版 = Business Strategy Reference
- 現場實際品牌與價格 = Founder Approved Override(最高優先)
