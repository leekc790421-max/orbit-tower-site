# SNT Orbit 站體部署日誌（P4 Orbit Productization）

> 依 SNT-DEPLOY-001：每筆部署（沙盒/正式）逐筆登記；版本號格式 v5.主版號.修正號，禁止使用 latest 直接覆蓋。
> Orbit 站（光曦星軌，orbit.xingdeng.tw）自 v5.4.0 起建立獨立部署日誌；Tower 站（光曦星閣）日誌見 repo 根 `governance/deploy-log.md`（Tower 已於 v5.3.10 結案 PASS）。

## 0. 部署鐵律（SNT-DEPLOY-001）

- 嚴禁直接於 Production 正式站施工。標準執行順序：工作區開發 ➔ 沙盒測試驗證 ➔ L1 自檢 ➔ L2 審查 ➔ 正式備份與版本編號編定（v5.4.0+）➔ 始可部署。
- 部署工具 `scripts/deploy.py` **預設 target=preview（沙盒）**；Production 部署必須顯式傳入 `production` 參數（工具層防呆）。**v5.4.1 起語意修正：preview=省略 target 欄位**（Vercel API 已不接受字串 'preview'；R1 時代傳入雖被接受，經查證實際標記為 production——見 §6 發現⑤）。
- 每筆部署登記欄位：輪次／版本／Commit／Deploy ID／Timestamp(UTC)／State／環境／驗證結果。
- 沙盒部署以 preview 唯一 URL 交付覆核，不綁定 orbit.xingdeng.tw；Production 域名於取得 Manus PASS 後始行配置。

## 1. 部署登記（逐筆）

| 輪次 | 版本 | Commit | Deploy ID | Timestamp (UTC) | State | 環境 | 備註 |
|---|---|---|---|---|---|---|---|
| R1 | v5.4.0 | tag v5.4.0（交付 commit） | dpl_7iuiwPXyhoLezvhxK26MYPEPMf3o | 2026-11-15 04:46:57 | READY | 沙盒 URL 隔離（API target 實值=production，查證於 v5.4.1 輪） | orbit-site-6ejj5fmdj-xfls.vercel.app；Deployment Protection 已關閉（供覆核取樣）；orbit.xingdeng.tw 未綁定、專案無任何域名→僅唯一 URL 可達，無公開曝光；本列實值經 v5.4.1 自我覆核輪補全（R1 沙盒快照=v5.4.0 交付時點內容） |
| R2 | v5.4.1 | tag v5.4.1（交付 commit） | 見 Release v5.4.1 部署登記 | — | READY（Release v5.4.1） | preview（target=None，API 複驗） | 自我覆核修正輪（GEMINI-ORDER-SELF-REVIEW）：筆誤修正＋欄位計數修正＋版本字串同步；部署後 live 複驗見 Release v5.4.1 |
| R3 | v5.4.2 | tag v5.4.2（交付 commit） | 見 Release v5.4.2 部署登記 | — | READY（Release v5.4.2） | preview（target=None，API 複驗） | FAIL 排查修正輪（MANUS-REVIEW-RESULT: FAIL）：quote 摘要遞送 UI 修復＋favicon.ico 補齊＋version 頁尾滯留缺陷修正；§7 事件登記 |
| R4 | v5.4.3 | tag v5.4.3（交付 commit） | 見 Release v5.4.3 部署登記 | — | READY | preview（target=None，API 複驗） | 正式上線遺留項補齊輪：og:image＋正式聯絡通道＋gen_manifest VERSION 條目黏行修復；§8 |
| P4-PROD | v5.4.3 | tag v5.4.3 | dpl_CCZpvvogGyWxNdT8A6yqpQWciaTg（2026-11-15，正式部署） | dpl_CCZpvvog… | READY（alias API 複驗） | production（alias=orbit.xingdeng.tw） | 正式環境上線：域名自 orbit-tower-3d 切換綁定；live 對帳 10/10；Tower 零碰觸複證 v5.3.10 |

## 2. P4 開工紀錄

- 2026-11-15：接獲 GEMINI-ORDER-P4-START（P2/P3 結案 PASS、解除暫停）。目標站點 orbit.xingdeng.tw（光曦星軌／企業數位總部），版本起點 v5.4.0。
- 2026-11-15 04:46:57 UTC：沙盒部署 READY（dpl_7iuiwPXy…，target=preview）。live 驗證：五頁+/VERSION/assets/governance 全 200 且版本字串=v5.4.0；Orbit manifest live 全項 11/11 OK；Deployment Protection 已關閉（供覆核取樣）。
- 現場調閱：orbit3d/ 為 3D 體驗站品牌原型（深色金視覺，canonical 已指向 orbit.xingdeng.tw）；GitHub PAT 無建立新 repo 權限（403）→ **決策**：P4 站體建於同 repo `orbit-site/` 子目錄，部署至獨立 Vercel 專案 `orbit-site`；Tower 交付態（v5.3.10 之 149 檔）零觸碰，`scripts/verify_freeze.py` 升級 P4 併行模式（Tower 交付檔逐檔硬驗零變更＋新增限 orbit-site/ 白名單），freeze-validation.md 加 P4 併行聲明。
- 視覺與品牌：延續 orbit3d 深色金語言（--gold #d4af37／--bg #0a0b0e）；品牌＝光曦星軌 Orbit；版本域：Orbit 站體 v5.4.x／治理文件 v5.1.1／產品包 v5.2.0。

## 3. 工項對照（GEMINI-ORDER-P4-START）

| 工項 | 落實 |
|---|---|
| ① 企業數位總部展示架構 | index.html 主視覺＋定位＋三大入口（企業方案/報價/租賃）與對接流程；enterprise/index.html 三級方案（標準/進階/旗艦）＋模組說明＋FAQ；品牌命名光曦星軌、SNT 全站互聯（Tower 互鏈） |
| ② 人工評估與報價入口 | quote/index.html 標準化報價入口：七欄位（公司/聯絡人/Email/電話(選填)/方案興趣/預算區間(選填)/需求概述;五必填二選填）＋前端驗證＋申請摘要生成；人工評估三步說明。**遞送通道（窗口信箱/API）＝正式環境配置項，沙盒以摘要確認呈現入口邏輯（頁內明示，不虛構信箱）** |
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

## 6. 自我覆核紀錄（GEMINI-ORDER-SELF-REVIEW，2026-11-15）

依強制自我覆核規範，v5.4.0 沙盒交付後執行全面內部自檢，逐項核實：

| # | 查核項 | 方法 | 實測結果 |
|---|---|---|---|
| 1 | 路由可用性 | live curl：沙盒 9 端點＋Tower 正式站 5 端點 | R1 沙盒 9/9 全 200；Tower /、/VERSION、/compliance、/sha256、registry 全 200 且=v5.3.10（零觸碰證明）；tower /version 404 為既有設計（/version 別名已移除，版本揭示走 /VERSION，Tower L1 有對應斷言） |
| 2 | 定價一致性 | regex 掃描（NT$/萬）＋Tower 價格 vs v5.3.10 tag | Orbit 展示四頁定價字串=零；quote 僅預算區間選項（萬×6=選項文案）、NT$=0；Tower 三價格字串 vs v5.3.10 tag 零變更 |
| 3 | verify_tags.sh 硬驗 | bash scripts/verify_tags.sh | PINNED 硬驗 7 個全 OK（v5.3.3…v5.3.9）＋v5.3.10 CURRENT 軟驗 OK；Orbit 線 tag v5.4.x 以 immutable GitHub Release 釘死，Tower tag-registry 凍結範圍不混入 orbit tag（兩線分冊） |
| 4 | deployment-registry.md SSOT | Tower L1 全項＋registry 與 compliance 對讀 | Tower L1 全部通過；v5.3.9/v5.3.10 鏈登記一致；Orbit 部署登記於本檔（R1/R2），兩站日誌分冊、不互斥不矛盾 |
| 5 | freeze-validation.md 實測數值 | verify_freeze.py 重放 vs 聲明文字 | 實測 146/149 零變更＋3 檔核定調整＋新增 13（限 orbit-site/**）＋零移除＝聲明數值完全一致；六段 immutable tag 硬性斷言全過 |

自檢發現並修正（本版 v5.4.1）：
- ①筆誤：本檔 §3「四大入口」與首頁實際「三大入口」不符→已修正。
- ②欄位計數：報價入口實為七欄位（五必填二選填），原記「六欄位/六結構化欄位」→已修正（本檔 §3 與交付包同步更正）。
- ③登記時點差異：R1 列實值原於部署後補記，致 R1 沙盒快照內無該實值→本版補全並於 R1 列明示快照時點；R2 列採「見 Release v5.4.1」現行筆機制，消除自參照矛盾。
- ④版本字串同步 v5.4.0→v5.4.1（五頁＋VERSION＋gen_manifest 檔頭＋L1 斷言＋Tower L1 R-P4）。
- ⑤部署工具語意：Vercel API 已不接受 `target:'preview'`（400 bad_request）；**查證 R1 部署 target 實值=production**——因 orbit-site 專案未綁定任何域名（orbit.xingdeng.tw 未配置），僅唯一 URL 可達，無公開曝光，沙盒隔離實效不變，但登記用語已如實更正（R1 列）；deploy.py 修正為 preview=省略 target 欄位（真 preview 語意，無生產標記），R2 起適用並於部署後以 API 複驗 target 實值。
- v5.4.0 Release 內文之同源筆誤（六欄位/四入口表述）依歷史文件原則不改寫，以本版為準。

自檢結論：五項查核全數通過、發現項全數修正後，內部自檢 100% 符合規範、無自參照語病與數據矛盾，方提報 Manus 獨立覆核。

## 7. 複核攔截事件登記（MANUS-REVIEW-RESULT: FAIL，2026-11-15）

- 事件：Manus 對 P4 沙盒 v5.4.0（R1 URL orbit-site-6ejj5fmdj-xfls.vercel.app）獨立複核判定 **FAIL**。依 SNT-REVIEW-001：正式域 orbit.xingdeng.tw 維持絕對隔離（本輪零觸碰，Tower 正式站四端點 live 複證 200=v5.3.10）、不得結案、不得進入下一階段。
- **缺失清單調閱聲明**：工單未附失敗日誌/缺失清單（upload/ 僅原始企劃書三份；全工作區無複核日誌檔）。依 GEMINI-ORDER-SELF-REVIEW 自檢機制，以「對抗式深度排查」替代，涵蓋工單指定四大項：展示架構／互動邏輯／報價與租賃模組／Tower 併行保護。
- R1（Manus 實際審視對象）live 取證：①R1 部署登記列為空值（Deploy ID/Timestamp/State=「—」）——治理可見缺失，v5.4.1 已修復（R2 內容補全），R1 快照依 immutable 原則不可改；②R1 列「preview 沙盒」表述與 API 查證 target=production 不符——v5.4.1 已如實更正登記；③直接請求 /favicon.ico 得 404（五頁 rel=icon SVG 原已具備，瀏覽器端不觸發；404 見於直接路徑請求）。
- 對抗式排查彙總（證據存檔 scripts/p4_fail_audit_out.txt）：**重大 3 項**——(a) 報價申請摘要生成後無複製/下載遞送 UI，互動鏈於沙盒端斷鏈；(b) /favicon.ico 直接請求路徑 404；(c) version 頁頁尾版本字串滯留 v5.4.0（og:description 之 v5.4.1 致字串掃描誤配，兩輪自檢漏網——本輪修正並將 L1 頁尾檢查改為頁尾列錨定）。**建議 6 項**——og:image 缺失×5（遞延：og 需絕對 URL，沙盒 URL 逐輪變動，留待正式域配置輪產製，避免於資產寫入臨時 URL）、報價摘要無下載（併入重大(a)處置）。誤報排除：quote 頁「【」為 SUBMIT_NOTE 刻意 UI 標籤，非佔位符。
- v5.4.2 修正對照：①quote 摘要新增「複製申請摘要」（clipboard API＋execCommand 降級）與「下載申請摘要（.txt）」（Blob）按鈕及成功回饋——互動鏈閉合；②新增 orbit-site/favicon.ico（logo-orbit.svg 向量轉製 48/32/16px，零外部依賴）——直接請求路徑 200，與既有 rel=icon 雙軌；③version 頁尾 v5.4.0→v5.4.2＋L1 頁尾檢查錨定強化；④Orbit L1 新增 favicon（rel=icon＋ICO 檔）／遞送 UI／JS-id 閉合檢查；⑤版本字串 v5.4.2 全線同步；⑥Tower 併行保護複驗四線全綠（verify_freeze／Tower L1／Orbit L1／verify_tags 7 PINNED）；新增檔數 13→14（仍限 orbit-site/**，P4 聲明範圍不變，freeze-validation v1.6 紀錄）。
- 修正排程：本輪即時完成（無外部依賴項）；og:image 併入正式域配置輪（P5 前置）。R3 部署＋四線重放＋live 複驗全綠後，方提報 Manus 新一輪獨立複查；本單位不自行宣告 PASS。

## 8. 正式上線登記（MANUS-REVIEW-RESULT: PASS＋整合執行令，2026-11-15）

Manus 對 P4 沙盒 v5.4.2（R3）獨立複核判定 **PASS**；整合執行令下達 P4 正式上線與遺留項補齊。本節為執行事實登記。

### 8.1 域名切換事實登記（orbit.xingdeng.tw）

- **切換前狀態取證**（2026-11-15）：域名綁定於 Vercel 專案 `orbit-tower-3d`（GET /v9/projects 全量盤點），實際服務內容為實驗頁「Orbit Tower — AI Digital Headquarters」（orbit3d/，無 /VERSION 端點，GET /VERSION 回 NOT_FOUND）；DNS 已指向 Vercel 邊緣（66.33.60.194 / 76.76.21.93）。
- **切換操作**（Vercel API，逐項留存）：`DELETE /v9/projects/orbit-tower-3d/domains/orbit.xingdeng.tw`（回 {}）→ `POST /v9/projects/orbit-site/domains {"name":"orbit.xingdeng.tw"}`（回 verified: true）。DNS 零異動（既有 CNAME 已指 Vercel，僅專案綁定切換）；orbit-tower-3d 專案本身零變更（實驗頁仍存於其 vercel.app URL）。
- **切換後複驗**：production 部署 alias 含 orbit.xingdeng.tw（API GET /v13/deployments/dpl_CCZpvvogGyWxNdT8A6yqpQWciaTg → alias 陣列實值）；https://orbit.xingdeng.tw live 對帳 10/10（/VERSION=v5.4.3、五頁頁尾/og:image/聯絡通道、og.png sha256 與 repo 一致、manifest 14/14、favicon.ico、quote 正式措辭）。

### 8.2 本輪部署序列（含迭代登記）

| 部署 | Deploy ID | target | 內容 |
|---|---|---|---|
| R4-a | dpl_FbQgKTy8btHSW1YBrfBJveKpqTF9 | preview | v5.4.3 初版（og:image＋聯絡通道＋版號全線） |
| R4-b | dpl_8xNsdZ9vDSBnBweFBUVT3aH3MMmt | preview | 同內容重部署（對帳腳本計數覆核用） |
| R4-c | dpl_AWPYtwevB5JNPBrX5R9Lc1Pvdaki | preview | manifest 修復後終版（見 8.3；R4 登記列以本部署為準） |
| P4-PROD | dpl_CCZpvvogGyWxNdT8A6yqpQWciaTg | production | 正式環境上線（alias=orbit.xingdeng.tw） |

### 8.3 gen_manifest.py VERSION 條目黏行缺陷修復（本輪發現即修）

- **缺陷**：`gen_manifest.py` 寫檔以 `chr(10).join(RULES_FROZEN)` 無結尾換行，RULES_FROZEN 末元素為 `"#"`，首條列（依排序為 VERSION）直接黏附其後，形成 `#e38f…  VERSION` 之形似註解行——所有以「# 開頭=註解」為慣例之讀取器（含 `sha256sum -c`、L1、live 對帳）皆誤濾該條目。該缺陷自 v5.4.0 起存在（非本輪引入）；**manifest 檔案本身恆完整**（VERSION 條目一直在檔），僅「可解析驗證覆蓋率」實為 13/14。
- **修復**：寫檔補結尾換行；重建後 14 條全數獨立可解析，VERSION 雜湊 e38f5513… 與實檔一致，L1「O-manifest 全項 14 檔重驗」實測通過。
- **影響評估**：Tower 凍結鏈不受影響（Tower manifest 由獨立工具產製，無此寫法）；歷史版本 manifest 依 immutable 原則不回溯改寫，以本節為準。

### 8.4 正式環境聯絡通道登記

- 聯絡窗口 **service@xingdeng.tw**——來源：主站 xingdeng.tw 既有公開資訊（非新造地址）；已置入五頁頁尾與 quote 正式環境說明（SUBMIT_NOTE：以複製/下載申請摘要遞送人工評估窗口）。自動化信箱/API 遞送通道為後續生態整合項（P5 後排程），本輪不虛構後端。

### 8.5 SSOT 界定與零碰觸複證

- 工單所載「deployment-registry.md / deploy-log.md 實值登記」：經 SSOT 界定，`governance/deployment-registry.md` 為 **Tower 專屬部署對帳 SSOT**，屬 Tower 凍結範圍（P4 核定調整 3 檔以外不可異動）；Orbit/Vip 部署登記分冊於本檔（與 §6 自檢第 4 項「兩站日誌分冊」原則一致），無互斥矛盾。
- Tower 正式站零碰觸：上線後複證 tower.xingdeng.tw /VERSION=200 v5.3.10；P4 核定調整 3 檔與 orbit-site/** 新增範圍不變（freeze-validation v1.7）。
- og:image 資產：assets/og.png（1200×630，PIL 本地產製 97,411 bytes，sha256 入 manifest）；og meta 絕對 URL=https://orbit.xingdeng.tw/assets/og.png（正式域，非臨時沙盒 URL，§7 遞延理由解除）。
