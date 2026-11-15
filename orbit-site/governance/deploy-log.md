# SNT Orbit 站體部署日誌（P4 Orbit Productization）

> 依 SNT-DEPLOY-001：每筆部署（沙盒/正式）逐筆登記；版本號格式 v5.主版號.修正號，禁止使用 latest 直接覆蓋。
> Orbit 站（光曦星軌，orbit.xingdeng.tw）自 v5.4.0 起建立獨立部署日誌；Tower 站（光曦星閣）日誌見 repo 根 `governance/deploy-log.md`（Tower 已於 v5.3.10 結案 PASS）。

## 0. 部署鐵律（SNT-DEPLOY-001）

- 嚴禁直接於 Production 正式站施工。標準執行順序：工作區開發 ➔ 沙盒測試驗證 ➔ L1 自檢 ➔ L2 審查 ➔ 正式備份與版本編號編定（v5.4.0+）➔ 始可部署。
- 部署工具 `scripts/deploy.py` **預設 target=preview（沙盒）**；Production 部署必須顯式傳入 `production` 參數（工具層防呆）。
- 每筆部署登記欄位：輪次／版本／Commit／Deploy ID／Timestamp(UTC)／State／環境／驗證結果。
- 沙盒部署以 preview 唯一 URL 交付覆核，不綁定 orbit.xingdeng.tw；Production 域名於取得 Manus PASS 後始行配置。

## 1. 部署登記（逐筆）

| 輪次 | 版本 | Commit | Deploy ID | Timestamp (UTC) | State | 環境 | 備註 |
|---|---|---|---|---|---|---|---|
| R1 | v5.4.0 | tag v5.4.0（交付 commit） | dpl_7iuiwPXyhoLezvhxK26MYPEPMf3o | 2026-11-15 04:46:57 | READY | preview 沙盒 | orbit-site-6ejj5fmdj-xfls.vercel.app；Deployment Protection 已關閉（供覆核取樣）；orbit.xingdeng.tw 未綁定 |

## 2. P4 開工紀錄

- 2026-11-15：接獲 GEMINI-ORDER-P4-START（P2/P3 結案 PASS、解除暫停）。目標站點 orbit.xingdeng.tw（光曦星軌／企業數位總部），版本起點 v5.4.0。
- 2026-11-15 04:46:57 UTC：沙盒部署 READY（dpl_7iuiwPXy…，target=preview）。live 驗證：五頁+/VERSION/assets/governance 全 200 且版本字串=v5.4.0；Orbit manifest live 全項 11/11 OK；Deployment Protection 已關閉（供覆核取樣）。
- 現場調閱：orbit3d/ 為 3D 體驗站品牌原型（深色金視覺，canonical 已指向 orbit.xingdeng.tw）；GitHub PAT 無建立新 repo 權限（403）→ **決策**：P4 站體建於同 repo `orbit-site/` 子目錄，部署至獨立 Vercel 專案 `orbit-site`；Tower 交付態（v5.3.10 之 149 檔）零觸碰，`scripts/verify_freeze.py` 升級 P4 併行模式（Tower 交付檔逐檔硬驗零變更＋新增限 orbit-site/ 白名單），freeze-validation.md 加 P4 併行聲明。
- 視覺與品牌：延續 orbit3d 深色金語言（--gold #d4af37／--bg #0a0b0e）；品牌＝光曦星軌 Orbit；版本域：Orbit 站體 v5.4.x／治理文件 v5.1.1／產品包 v5.2.0。

## 3. 工項對照（GEMINI-ORDER-P4-START）

| 工項 | 落實 |
|---|---|
| ① 企業數位總部展示架構 | index.html 主視覺＋定位＋四大入口與對接流程；enterprise/index.html 三級方案（標準/進階/旗艦）＋模組說明＋FAQ；品牌命名光曦星軌、SNT 全站互聯（Tower 互鏈） |
| ② 人工評估與報價入口 | quote/index.html 標準化報價入口：結構化欄位（公司/聯絡人/Email/方案興趣/預算區間/需求概述）＋前端驗證＋申請摘要生成；人工評估三步說明。**遞送通道（窗口信箱/API）＝正式環境配置項，沙盒以摘要確認呈現入口邏輯（頁內明示，不虛構信箱）** |
| ③ 租賃方案模組 | rental/index.html 三檔方案（入門/標準/旗艦）＋計價邏輯（平台檔位×上稿量×維護等級）＋商務條款要點（租期/付款/終止移交/資安個資）；定價數字一律經人工評估報價提出（頁內明示） |
| 版本與治理 | VERSION=v5.4.0；version/index.html（版本域/工項狀態/部署登記）；governance/（本檔＋manifest）；scripts/（deploy.py 預設 preview、gen_manifest.py、l1_check.py） |

## 4. L1／L2

- L1：`python3 orbit-site/scripts/l1_check.py`（於 repo 根目錄）——檔案完備/版本字串一致性/內部連結閉環/表單欄位與驗證邏輯/manifest 全項/鐵律登記，全過始可交付。**實測：全部通過 ✅（21 項，冪等重跑一致）；Tower L1 亦全過（manifest 檢查已改交付態 tag v5.3.10 錨定）。**
- L2 審查紀錄（2026-11-15，施工單位 L2）：
  - ①品牌命名「光曦星軌 Orbit」對齊 SNT v5.1.1 全站互聯規範 ✓（五頁標題/頁尾/互聯連結）
  - ②全站互聯：五頁均含光曦星閣 Tower 互鏈與治理連結 ✓
  - ③報價入口：結構化欄位＋前端驗證＋摘要生成；**無自動報價、零 mailto 虛構信箱、沙盒性質頁內明示** ✓
  - ④租賃計價：三因素結構透明、**不含定價數字**、正式報價經人工評估明示 ✓
  - ⑤商務條款要點五項（租期付款/服務範圍/終止移交/資安個資/以簽約文件為準）✓
  - ⑥沙盒隔離：preview 專用唯一 URL，orbit.xingdeng.tw 與 Tower production 均未觸碰 ✓
  - ⑦內容：零佔位符、零虛構數據/案例 ✓
  - ⑧行動版選單防呆（max-height+overflow，Tower DEF-001 教訓）✓
  - **L2 判定：通過，提交 Manus 獨立覆核（P4 沙盒輪）。**

## 5. 回滾

- 沙盒輪：回滾＝以上一 commit 重新部署 preview；沙盒 URL 為唯一網址不影響任何正式域名。
- Production（未來）：一階回滾＝前一 Release tag 重部署（production target）；原始碼 `git checkout <tag>`。
