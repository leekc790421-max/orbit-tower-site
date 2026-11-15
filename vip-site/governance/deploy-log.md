# SNT 光曦星匯 Vip 部署日誌（deploy-log.md）— 站體 v5.5.0

P5 VIP Productization（光曦星匯）沙盒部署與治理日誌。依 SNT-GOV-001 / SNT-DEPLOY-001 / SNT-REVIEW-001（v5.1.1 創辦人核定版）治理；工項依據：MANUS-REVIEW-RESULT: PASS＋整合執行令（P4 正式上線＋P5 完整建置）＋P5 規格追加令（3D 立體互動水晶球）。

## 1. 部署鐵律（SNT-DEPLOY-001）

- **嚴禁直接於 Production（vip.xingdeng.tw）觸碰**：正式域於取得 Manus PASS 前零碰觸；全部開發於隔離工作區完成，部署僅至 **preview 沙盒**（Vercel 唯一 URL）。
- 流程：工作區開發 → preview 沙盒 → L1/L2 強制自行覆核 → 編版（commit/tag/Release）→ 提報 Manus 獨立覆核。本單位不自行宣告 PASS。
- 部署工具 `scripts/deploy.py` **預設 target=preview（沙盒）**；Production 部署必須顯式傳入 `production` 參數（工具層防呆）。preview=省略 target 欄位（真 preview 語意，沿用 P4 v5.4.1 起語意）。
- Tower/Orbit 既有檔案凍結零變更：`scripts/verify_freeze.py` P5 併行模式——Tower 交付態逐檔硬驗（146/149 零變更＋3 檔核定調整），工作區新增限 `orbit-site/**`＋`vip-site/**`（v1.8 擴展，見 Tower freeze-validation）。

## 2. 沙盒部署登記

| 輪次 | 版本 | commit/標籤 | 部署登記 | Deploy ID | State | target | 摘要 |
|---|---|---|---|---|---|---|---|
| R1 | v5.5.0 | tag v5.5.0（交付 commit） | 見 Release v5.5.0 部署登記 | — | READY | preview（target=None，API 複驗） | P5 首輪沙盒交付：五頁＋3D 立體互動水晶球＋定價鐵律＋預約閉環；L1 32 項＋雙端 3D 取證 |

### 2.1 R1 部署迭代與終值

| 迭代 | Deploy ID | URL | 內容 |
|---|---|---|---|
| R1-a | dpl_BuUE6AqYhbwsZ7Ns2XugmGP61Mks | vip-site-mk62z0po8-xfls.vercel.app | 初版（撞出 Vercel Authentication 保護牆,見 2.2） |
| R1-b | dpl_GxkEKNxo28qX3x3uJ91NfAyNiCyz | vip-site-p23vhgbgk-xfls.vercel.app | VS_P/FS_P 共用 uniform 精度不一致修復（headless E2E 取證觸發,真實瀏覽器同樣命中——重大缺陷即時修復） |
| R1-c（終值） | dpl_ET1aAN7RpJabSwUrRyojymS11zMd | vip-site-q531crnpj-xfls.vercel.app | Fresnel 過曝抑制＋色彩 clamp（雙端截圖目視複驗後微調）;本列以此為 R1 登記終值 |

### 2.2 沙盒環境事件登記（如實登記）

- **專案歸屬**：部署掛載於帳號內既有專案 `vip-site`（prj_TE5VOLSn…，此前零部署、僅 vercel.app 別名 vip-site-rho.vercel.app、無自訂域）——本輪部署為該專案**首次部署**，依 Vercel 行為自動標記 target=production（與 P4 R1 同因）；因無自訂域綁定，公開曝光面僅 vercel.app URL，沙盒隔離實效不變。**正式域 vip.xingdeng.tw 全程零碰觸**（其綁定於 cosmosphere-vip 專案，已另案取證）。
- **Vercel Authentication 事件**：R1-a 部署後 URL 呈現「Protected by Vercel Authentication」挑戰頁（新專案預設部署保護）。處置：`PATCH /v9/projects/vip-site {"ssoProtection": null}` 解除後 URL 正常服務；經 API 複驗為專案級設定變更，非部署內容變更。
- **著色器精度缺陷（重大,即時修復）**：headless E2E 取證發現 VS_P（vertex 預設 highp）與 FS_P（mediump）共用 uniform uBurst/uTemp 精度不一致→著色器連結失敗→整體優雅降級。該缺陷對真實瀏覽器同樣生效（L1 靜態檢查無法涵蓋 GLSL 連結期語意——L2 動態驗證價值實證）。R1-b 修復：VS_P 補 `precision mediump float;`，E2E 實測 mode=webgl（真 3D）。
- **視覺微調**：R1-c 依雙端截圖目視複驗，抑制 Fresnel rim 過曝（0.9→0.55＋uBurst 項 1.6→0.7）並加 `min(col,1.0)` clamp；平靜態/脈衝態雙取證。

## 3. 站體架構（五頁）

| 頁面 | 路由 | 內容 |
|---|---|---|
| 首頁 | / | 品牌定位＋**3D 立體互動水晶球**＋三大入口＋服務流程；SNT 全站互聯 |
| 會員方案 | /membership/ | T1 標準 7,800／T2 進階 13,900／T3 旗艦 24,800＋權益對照表＋級距鐵律聲明 |
| 顧問服務 | /consultants/ | 文化顧問／命理顧問／一對一專屬諮詢＋**服務倫理聲明**（明文化邊界） |
| 預約評估 | /appointment/ | 結構化預約申請（五必填二選填）＋前端驗證＋**摘要複製（clipboard＋execCommand 降級）／下載（Blob .txt）遞送閉環**，編號前綴 VIP- |
| 版本資訊 | /version/ | 版本域定義、部署登記、3D 合規、定價鐵律、正式域零碰觸聲明 |

視覺識別：沿用 SNT 四站深色金設計語言（同 Orbit 設計系統基因），增補 --ice 冰金色溫（呼應水晶球色溫切換）；站標 logo-vip.svg（水晶球+星軌標識）；全站字型走系統字堆疊，零外部字體依賴。

## 4. 3D 立體互動水晶球（規格追加令落實登記）

| 規格項 | 落實 | 驗收方式 |
|---|---|---|
| 3D 立體渲染與視覺質感 | 自研 WebGL 管線（assets/crystal.js）：真 3D 球體網格（56×36 經緯），Fresnel 環邊、Blinn-Phong 雙光 Specular、refract 折射程序化星場、內部 460 顆星塵（POINTS 加色）、三環星軌能量流；深色金材質語言與 orbit3d 參考一致 | L1 管線特徵檢查＋E2E WebGL 模式渲染截圖（桌面/手機雙端） |
| 多維度互動控制 | 拖曳旋轉（慣性阻尼）、滾輪縮放（2.15–4.6 clamp）、觸控滑動（Pointer Events＋touch-action:none）、點擊能量脈衝（星塵外擴＋色溫金↔冰切換＋狀態文案聯動＋預約入口 chip）、懸停光暈 | L1 互動特徵檢查＋E2E 互動斷言（旋轉/縮放/脈衝計數/色溫） |
| 效能、離線與降級 | 單一 rAF 迴圈、零逐幀配置、DPR≤2、visibilitychange＋IntersectionObserver 離屏暫停、webglcontextlost/restored 防洩漏；**零外部未控依賴**（crystal.js 為站內檔案，納入 manifest 雜湊清點）；WebGL 不支援環境優雅降級（靜態面板＋明示提示，功能不受影響） | L1 守衛特徵檢查＋manifest 覆蓋＋headless WebGL 實測 |
| L1/L2 自檢必查 | V-3D 系列 6 項（管線真 3D／互動／降級／效能守衛／零外部資源／canvas 掛載）＋E2E 互動斷言＋雙端截圖存證 | 本檔 §7＋送審包 |

## 5. 定價鐵律（跨站計價零偏差）

- 方案級距嚴格對齊 SNT 標準方案級距：**T1：7,800／T2：13,900／T3：24,800**。
- 全站 NT$ 數字掃描（L1 regex）＝僅上述三值，無第四個定價數字；除級距外不另行報價，正式報價以人工評估與簽約文件為準。

## 6. 正式域零碰觸聲明（vip.xingdeng.tw）

- 盤點取證（2026-11-15）：正式域現由既有 Vercel 專案 `cosmosphere-vip` 服務（live title「光曜星棧・CosmoSphere 黑卡算力會所」，HTTP 200）。
- **本輪 P5 沙盒階段對該專案與域名零觸碰**（僅唯讀 GET 取證）；P5 交付物全部部署於新沙盒專案（preview 唯一 URL）。
- 正式切換於取得 Manus PASS 後另輪執行，比照 P4 慣例：切換前狀態取證 → API 域名切換 → production 部署 → live 對帳，全程事實登記。

## 7. 自檢與送審聲明

- L1 強制自檢：`scripts/l1_check.py` 32 項（檔案完備/版本字串/內部連結閉環/導覽防呆/定價鐵律/倫理聲明/表單閉環/3D 六查/favicon/og/四站互聯/manifest 全項/無佔位符）。
- L2 動態驗證：E2E 互動實測（3D 拖曳/縮放/脈衝/降級＋預約表單閉環：填表→送出→摘要→複製→下載）＋桌面/手機雙端 3D 渲染截圖存證。
- 保護線重放：Tower L1／Orbit L1／verify_freeze（146/149＋3 核定調整＋新增限 orbit-site/**＋vip-site/**）／verify_tags 7 PINNED。
- 全數綠燈後一次性打包提交 Manus 獨立覆核；**本單位不自行宣告 PASS**。
