# SNT 版本變更紀錄 (CHANGELOG)

> 依 SNT-DEPLOY-001 規範,每次版本發布必須產出正式變更紀錄。
> 版本號格式:v5.主版號.修正號,禁止使用 latest 直接覆蓋。
> 當企劃與創辦人決策衝突,以 Founder Approved Override 為準。
> 本檔位於 tower repo 內,公開核驗 URL:https://tower.xingdeng.tw/governance/CHANGELOG.md

---

## v5.3.5 defect-fix · 2026-11-15 · P2-R1 Defect Fix (COPILOT-EXEC-006)

### 變更摘要

創辦人核定方案 A(不採用方案 B),依《SNT_P2-R1_缺陷調查報告》修復 DEF-002/003/004 與 C-RISK-001;DEF-001 手機導覽經調查確認行為已修復,本版不再變更,僅保留 4 viewport(320/360/390/428px)回歸證據提交 MANUS 複驗。本版不得推進 P3。

### 修復內容

| # | 缺陷 | 修復 |
|---|---|---|
| DEF-002 | SHA-256 Manifest 一致性 | governance/backup-manifest.sha256 全量重建:移除未部署項目(A39C0B14F006967E8754E39805A5B040.txt 已下線、package.json/package-lock.json 為 repo 檔);檔頭註明涵蓋規則、排除規則與 api/* 檢核規則(含工作區雜湊附錄);VERSION 納入驗證;部署後全量重驗(sha256sum -c) |
| DEF-003 | Deploy Log 不一致 | governance/deploy-log.md 補列 v5.3.3 後續部署與 v5.3.4 全鏈共 5 筆漏列(含 MANUS 覆核對象 ef665d0/dpl_CrjfgSM);日期依 Vercel API 實測校正(v5.0.0=11-11、v5.3.3=11-13、v5.3.4 全鏈=11-14);部署 URL 分級標示(vercel.app 受 SSO 保護,公開證據改以 Production 網域+/VERSION);L1 與 MANUS 結論差異來源註記(測試對象版本不同) |
| DEF-004 | Version Strategy 不一致 | 版本域定義:治理文件 v5.1.1 / 站體 v5.3.x / 產品包 v5.2.0,不得混用;compliance 頁、builder 六頁頁尾、README 版本說明、Setup 版本說明同步至對應版本域;tag v5.3.4(ca81640)保留存查不移動,新施工版本以新建 tag v5.3.5 為不可變參照,使 tag=main HEAD=Production=manifest 四者一致 |
| C-RISK-001 | /sha256 頂層別名 404 | vercel.json redirects 新增 /sha256 → /builder/sha256 |

### 修改檔案

| 路徑 | 變更 |
|---|---|
| VERSION | v5.3.4 → v5.3.5 |
| vercel.json | redirects 新增 /sha256 別名;移除 /version 頂層別名(redirects 恆為 case-insensitive 且先於檔案系統,/version 別名存在時 /VERSION 必被 307 攔截,治理版本檔無法直接存取;移除後 /VERSION 確定性回傳版本檔,/version 以 /builder/version 與 /VERSION 為準);並還原部署態之 name/version 鍵(修正 repo 與工作區漂移) |
| builder/index.html | badge/Version 卡/頁尾 → 站體 v5.3.5 |
| builder/demo/index.html | 頁尾 → v5.3.5 |
| builder/readme/index.html | 版本說明與頁尾改為「產品包文件 v5.2.0 + 站體 v5.3.5」雙域標示 |
| builder/setup/index.html | 頁尾 → v5.3.5;zip 檔名處加註產品包版本域 |
| builder/sha256/index.html | 頁尾 → v5.3.5;產品包版本語境標註 |
| builder/warranty/index.html | 頁尾 → v5.3.5;保固說明版本域標註 |
| builder/version/index.html | 全頁 v5.3.5;新增「版本域定義」區塊;歷史表補 v5.3.5 列;公開核驗證據改分級標示 |
| compliance/index.html | 現行版本/tag/備份層/回滾說明同步 v5.3.5;部署紀錄表補 v5.3.4 全鏈與 v5.3.5 |
| governance/deploy-log.md | DEF-003 全項(見上) |
| governance/CHANGELOG.md | 本條目 |
| governance/backup-manifest.sha256 | DEF-002 全項(見上) |

### 版本域定義(DEF-004)

- 治理文件版本:v5.1.1(《SNT_v5.1.1_創辦人核定版.pdf》,最高依據)
- 站體工程版本:v5.3.5(/VERSION、/builder/version、頁尾、git tag、manifest)
- 產品包版本:v5.2.0(README 文件、builder-t{1,2,3}-v5.2.0.zip、保固卡)
- 三域各自編號、標示時必須帶域名,不得混用。

### 授權依據

- COPILOT-EXEC-006(2026-11-15,創辦人核定):採用方案 A、不採用方案 B;版本 v5.3.5;核准施工範圍 DEF-002/003/004 + C-RISK-001;DEF-001 視為已修復僅存證;tag 政策停止移動 v5.3.4。
- 完成後提交 P2-R1 Defect Report 與 Completion Package 交 MANUS 複驗;未取得 MANUS PASS 不得提交 P2 Completion Report,不得推進 P3。

---

## v5.3.4 defect-fix · 2026-11-15 · MANus FAIL DEF-001~004 修復 (COPILOT-EXEC-005)

### 變更摘要

MANUS 對 v5.3.4 P2 判定 FAIL,指出 4 項缺陷(DEF-001 手機導覽、DEF-002 manifest、DEF-003 deploy ID、DEF-004 版本策略)。本修復逐一閉環,提交 MANUS 重新覆核。

### 缺陷修復

| # | 缺陷 | 根因 | 修復 |
|---|---|---|---|
| DEF-001 | 手機導覽閉環(320/360/390/428px)7 Builder 入口不可見 | CSS @media(768px) `.nav__more{display:none}` 隱藏整個更多下拉;12 頁(builder/* + verification/compliance)無 burger 按鈕;2 頁(checkout)有 burger 但缺 site.js | (1) CSS 改為 nav__links.open 時更多下拉平面垂直列表;(2) 12 頁補 burger 按鈕;(3) 15 頁補 inline toggle script;(4) builder/version 補 Demo+README 連結;(5) CSS 加 overflow-wrap:break-word + table 響應式。agent-browser 實測 4 viewport × 2 頁面 = 8 組合全 PASS |
| DEF-002 | SHA256 manifest 未含 VERSION | 原 find 用副檔名過濾,VERSION 無副檔名被漏 | manifest 生成腳本顯式納入 VERSION + 所有 .md/.html/.css/.js/.json/.txt/.xml/.jsonld,並完成自驗(SHA 比對) |
| DEF-003 | deploy-log Deploy ID 與實際不一致 | deploy-log 記 dpl_GiikSNpB...(首次部署),但 defect-fix 後現行 Production 為 dpl_7yipkLRPEP...(f0fade8) | deploy-log v5.3.4 列更新為現行 deploy ID dpl_7yipkLRPEPPUfao8jxKtuMSbqyoA |
| DEF-004 | tag v5.3.4 vs ef665d Production commit 關係混淆 | tag v5.3.4→52d6722(code),Production=ef665d0(governance),兩者分離致版本混淆 | tag v5.3.4 移至最終 commit(含 defect-fix code + governance evidence),使 tag = Production = 不再分離。commit 鏈完整記錄於 deploy-log |

### 修改檔案

| 路徑 | 變更 |
|---|---|
| `assets/site.css` | DEF-001: 手機 nav CSS(更多下拉平面列表 + overflow-wrap + table 響應式) |
| 12 個 builder/* + verification/compliance HTML | DEF-001: 補 nav__burger 按鈕 |
| 15 個 HTML(上述 12 + checkout 2 + builder/version) | DEF-001: 補 inline burger toggle script |
| `builder/version/index.html` | DEF-001 R3: 補 Demo+README nav 連結 |
| `governance/deploy-log.md` | DEF-003: 現行 deploy ID;DEF-004: 版本策略文件 |
| `governance/CHANGELOG.md` | 本條目(defect-fix 紀錄) |
| `governance/backup-manifest.sha256` | DEF-002: 重建(含 VERSION + 自驗) |

### DEF-001 手機導覽驗證(agent-browser 實測)

| Viewport | 頁面 | burger 可見 | nav 開啟 | 7 入口全可見 | 無水平捲動 |
|---|---|---|---|---|---|
| 320px | / | ✅ | ✅ | ✅ | ✅ |
| 320px | /builder/version | ✅ | ✅ | ✅ | ✅ |
| 360px | / | ✅ | ✅ | ✅ | ✅ |
| 360px | /builder/version | ✅ | ✅ | ✅ | ✅ |
| 390px | / | ✅ | ✅ | ✅ | ✅ |
| 390px | /builder/version | ✅ | ✅ | ✅ | ✅ |
| 428px | / | ✅ | ✅ | ✅ | ✅ |
| 428px | /builder/version | ✅ | ✅ | ✅ | ✅ |

### 授權依據

- COPILOT-EXEC-005(2026-11-15):允許修正範圍僅限 P2 Defect Fix,不得進入 P3。不得修改產品內容/定價/品牌/Orbit/VIP。
- 完成後提交 P2 Defect Report 交 MANUS 重新覆核,不得提交 P2 Completion Report 直到 PASS。

---

## v5.3.4 · 2026-11-15 · P2 Nav Closure (L3-SIGN-001)

### 變更摘要

依 L3-SIGN-001(A.C. LEE 核定,2026-11-15)修補 P2 Tower Builder Foundation 導覽列缺口(F-nav)。v5.3.3 已完成 /builder 七大頁面、T1/T2/T3 產品頁、404 路由、合規證據,但主站導覽列未掛 Builder 入口,訪客無法從首頁導覽列進入 Builder 區。本版閉環導覽列,完成 P2 驗收條件「導覽列連結正常」。

### 修復項目

| # | 缺失 | 修復 |
|---|---|---|
| 1 | 主站 26 頁導覽列無 Builder 入口 | 「更多 ▾」下拉選單新增 Builder / Demo / README / Setup / Version / SHA256 / Warranty 七入口 |
| 2 | Builder 區 10 頁缺 SHA256 連結 | 區段導覽列補入 SHA256(Version 與保固之間) |
| 3 | verification / compliance 頁 Builder 連結無子連結 | 轉為下拉選單,含 7 個 Builder 子連結 |
| 4 | 桌機 / 手機導覽同步 | 響應式單一 nav markup,一改兩版同步 |

### 修改檔案

| 路徑 | 變更 |
|---|---|
| `VERSION` | v5.3.3 → v5.3.4 |
| `builder/version/index.html` | v5.3.3 → v5.3.4(標題/meta/og/jsonld/h1/歷史表/變更區/頁尾)+ 新增 v5.3.4 歷史列 + 變更內容改為 Nav Closure |
| 26 個主站 HTML | nav__dropdown 新增 7 個 Builder 入口(index、pricing、faq、articles/a01-a09、kits、showcase、diagnose、departments、checkout、about、try、orbit-tower、demo、reports、contact、404) |
| 10 個 builder/* HTML | 區段導覽列補 SHA256 連結(builder/index、demo、readme、setup、version、sha256、warranty、packages/index、packages/t1、t2、t3) |
| `verification/index.html`、`compliance/index.html` | Builder 連結 → 下拉選單(7 子連結) |
| `governance/CHANGELOG.md` | 新增 v5.3.4 條目(本檔) |

### 授權依據

- L3-SIGN-001(A.C. LEE,2026-11-15):核准 Path A,STATUS-LOCKED 局部解除(僅 P2 Builder Foundation),授權修補導覽列缺口並發布 v5.3.4。
- 禁止事項:不得修改產品定價、品牌名稱、Orbit/VIP/P3/P4/P5 內容。

### 公開核驗證據

- 版本編號:v5.3.4(/VERSION、/builder/version、footer 三處一致)
- git tag:https://github.com/leekc790421-max/orbit-tower-site/releases/tag/v5.3.4(不可變)
- SHA-256 manifest:/governance/backup-manifest.sha256(部署後重建)
- 部署紀錄:/governance/deploy-log.md

### 部署狀態

部署至 Production(tower.xingdeng.tw),提交 Manus L2 覆核。等 PASS 後提交 P2 Completion Report。

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
