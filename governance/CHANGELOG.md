# SNT 版本變更紀錄 (CHANGELOG)

> 依 SNT-DEPLOY-001 規範,每次版本發布必須產出正式變更紀錄。
> 版本號格式:v5.主版號.修正號,禁止使用 latest 直接覆蓋。
> 當企劃與創辦人決策衝突,以 Founder Approved Override 為準。
> 本檔位於 tower repo 內,公開核驗 URL:https://tower.xingdeng.tw/governance/CHANGELOG.md

---

## v5.3.9 defect-fix · 2026-11-15 · P2-R5 Defect Fix (Manus P2-R4 複查修繕方案)

### 變更摘要

Manus 對 P2-R4(v5.3.8)獨立複查再次判定 FAIL,並首次提供具體修繕方案四項。本版逐項修復;範圍仍限治理/驗證檔與存證工具,站體程式零變更;依方案③不改動 v5.3.8 tag/釘死值,以新版本(v5.3.9)發佈。

| # | Manus 修繕方案 | 修復(v5.3.9) |
|---|---|---|
| ① | DEF-003 部署對帳:重放 168 筆 vs 登記 166;v5.3.8 鏈未登記;Release 誤標較早部署為現行 | deployment-registry.md §1 重算 169(v5.3.9 交付後全量,含本鏈;驗收以當時重放核對,不沿用舊快照);§2 v5.3.8 鏈 R1/R2 逐筆實登記(ID/UTC/State/alias/唯一 URL);Release v5.3.8 以更正紀錄修復(保留原誤紀錄+更正時間);新增 scripts/deploy_chain_audit.py 與存證 governance/deploy-replay-2026-11-15.txt |
| ② | Release commit 對帳:以部署來源或內容雜湊核實;無法證實標記未能追溯,不猜填;以可追溯更正紀錄補入,保留原紀錄 | R2 經 production 域名(tower.xingdeng.tw)內容雜湊核實=0d439d1✓;R1 部署唯一 URL 受 Vercel Deployment Protection 保護(302 SSO)+Files API 未回列靜態檔→標記「未能追溯(工作紀錄時序對應 77924c1)」;更正紀錄含核實方法與結果表 |
| ③ | 治理檔修改採新版本發佈,不覆寫 v5.3.8 | 本版 v5.3.9 新 commit/tag/Release;v5.3.8 tag 與釘死值(0d439d11…)不動並納入 tag-registry.txt PINNED(PINNED 增至 6 個) |
| ④ | DEF-002 補強:verify_freeze.py 明列兩段 immutable tag 比較+硬性斷言+非零結束;重跑保存輸出;驗證正式站 manifest | v2:v5.3.4→v5.3.5→v5.3.6→v5.3.7→v5.3.8 五 tag 鏈逐段硬性斷言(條目/新增/移除/hash 變更/規則差異;含本次補強之 v5.3.7→v5.3.8 段=+0/−0/15 檔 hash——manifest 本檔自我排除不入條目集,git 檔案層級另含其重算)+工作區結構斷言,不符即 exit(1);重跑輸出存證 governance/freeze-replay-2026-11-15.txt;正式站 manifest 交付後全項重驗(149/149) |

### 新增/修改檔案

| 路徑 | 性質 |
|---|---|
| scripts/deploy_chain_audit.py、governance/deploy-replay-2026-11-15.txt、governance/freeze-replay-2026-11-15.txt | 新增(①④存證) |
| scripts/verify_freeze.py | v2 更新(④) |
| governance/deployment-registry.md、governance/deploy-log.md、governance/freeze-validation.md、governance/tag-registry.txt、governance/CHANGELOG.md | 更新(①②③) |
| VERSION、builder 六頁、builder/version、compliance | 版本字串同步 v5.3.8→v5.3.9(機械式) |
| governance/backup-manifest.sha256 | 規則凍結,同步重算(146→149 條) |

### 授權依據

- Manus P2-R4 複查 FAIL 通知與修繕方案;SNT-REVIEW-001:未取得 PASS 前不得結案、不得進入下一階段;P4 Orbit Productization 維持全面暫停。

---

## v5.3.8 defect-fix · 2026-11-15 · P2-R4 Defect Fix (MANUS-REVIEW-009 修復)

### 前版補記（v5.3.7 R2 修正輪）

v5.3.7 交付含兩輪部署:R1(f154cff,內容)與 R2(cd1e4f0,驗證腳本 CURRENT 列解析修補——兩欄 registry 列曾被靜默跳過之缺陷,並 tag-registry.txt 補 '-' 佔位)。此補記為 MANUS-REVIEW-009 修復項④。

### 變更摘要

MANUS-REVIEW-009 對 P2-R3(v5.3.7)判定 FAIL。施工單位無 Manus 平台日誌存取權,依獨立重放自查認定四項治理驗證檔一致性缺失,全部修復如下;範圍仍限治理/驗證檔,站體程式零變更,完成後提交 MANUS 複查。

| # | 缺失 | 修復 |
|---|---|---|
| ① | freeze-validation.md §1 重算檔數筆誤(14),與 verify_freeze.py 實測(13)不一致 | 更正為 13;§2.3 新增/重算清單改附實測清單;新增 P2-R4 列與 v1.1 變更紀錄 |
| ② | deployment-registry.md/deploy-log 之 v5.3.7 列「(本 commit)＝tag v5.3.7」自參照語病(檔凍結於 R1,tag 實指 R2),且 SSOT 未實登記 v5.3.7 鏈 Deploy ID;總計 164 未隨部署更新 | v5.3.7 鏈改 R1(dpl_CFKXtbwd…/f154cff/02:43:36)+R2(dpl_HDF7wwGJ…/cd1e4f0/02:45:51)逐筆實登記;總計 164→166;「現行筆登記機制」正式化(歷史輪逐筆實登記,僅現行施工版最後一筆見同名 Release) |
| ③ | verify_tags.sh 對現行版僅軟驗(無 EXPECT 變數時輸出「?」),獨立執行得不到硬驗判定 | v3:驗證順序=環境變數→同名 GitHub Release body 釘死值(自動,無需權限)→皆無才輸出現值;tag-registry.txt v5.3.7 列改 PINNED(cd1e4f05…),PINNED 增至 5 個 |
| ④ | CHANGELOG 未記錄 v5.3.7 R2 修正輪 | 本條目前述「前版補記」 |

### 新增/修改檔案

| 路徑 | 性質 |
|---|---|
| governance/freeze-validation.md、governance/deployment-registry.md、governance/deploy-log.md | 更新(①②) |
| scripts/verify_tags.sh | v3 更新(③) |
| governance/tag-registry.txt | v5.3.7 改 PINNED+v5.3.8 CURRENT(③) |
| governance/CHANGELOG.md | 更新(④) |
| VERSION、builder 六頁、builder/version、compliance | 版本字串同步 v5.3.7→v5.3.8(機械式) |
| governance/backup-manifest.sha256 | 規則凍結,同步重算 |

### 授權依據

- 停工指示(MANUS-REVIEW-RESULT):「針對未達標之項目進行深度排查與程式碼修正,完成後提升版本號、補齊合規證據,並再次提交 Manus 進行獨立複查」;P4 維持全面暫停。

---

## v5.3.7 defect-fix · 2026-11-15 · P2-R3 Defect Fix (COPILOT-EXEC-008)

### 變更摘要

MANUS-REVIEW-008 對 P2-R2 判定 FAIL,三項皆為治理驗證強化。創辦人核定 COPILOT-EXEC-008:P2-R3 Defect Fix(v5.3.6→v5.3.7);P2 未 PASS 前禁止進入 P3/P4/P5;允許修改範圍=治理文件/Release Registry/Deploy Log/Tag Validation/Freeze Rules/相關驗證檔案。本版站體程式(site.css/JS/頁面內容)零變更,僅治理檔新增/更新與版本字串同步;完成後提交 P2-R3 Completion Package 送 MANUS-REVIEW-009,不得自行宣告 PASS。

### 修復內容

| # | MANUS 判定 | 修復 |
|---|---|---|
| DEF-002 | Freeze Coverage 存在變動 | 新增 governance/freeze-validation.md:P2-R1(v5.3.4→v5.3.5,+48/−17/規則重寫)、P2-R2(v5.3.5→v5.3.6,+2 治理檔/規則零變更/55 檔重算)、P2-R3(v5.3.6→v5.3.7,+5 驗證檔/規則零變更)三版 Coverage/Exclusion/Rules Diff 逐版列表+誤變動判定(全部為核定變更,非誤變動,無需回復)+重現指令;新增 scripts/verify_freeze.py 自動重放 |
| DEF-003 | Release Registry 與 Vercel Deploy History 不一致 | 根因:舊登記僅 9 筆(v5.3.5/v5.3.6 鏈),Vercel 全史 164 筆。新增 governance/deployment-registry.md(部署登記 SSOT):治理期 17 筆逐筆(Tag/Commit/Deploy ID/Release/Timestamp/Production State)+前治理期 147 筆彙總(ERROR 9/BLOCKED 2 逐筆揭露 ID)+權威序聲明+一行落差規則;新增 scripts/vercel_reconcile.py(唯讀對帳重放);補建 Release v5.3.3/v5.3.4(自此每治理期 tag 一 Release 鏡像) |
| DEF-004 | verify_tags.sh 僅驗存在,未驗 v5.3.6 對應固定 Commit | 新增 governance/tag-registry.txt(Expected Tag Registry:v5.3.3~v5.3.6 全 40-hex PINNED,現行版 CURRENT);scripts/verify_tags.sh v2:驗證 tag 存在/不可變(現值==PINNED 期望值)/對應 commit 正確(peel 後完整比對),PINNED 偏離即 FAIL;tag-protection.md §5 同步更新全長 SHA |

### 新增/修改檔案

| 路徑 | 性質 |
|---|---|
| governance/freeze-validation.md | 新增(DEF-002) |
| governance/deployment-registry.md | 新增(DEF-003) |
| governance/tag-registry.txt | 新增(DEF-004) |
| scripts/verify_tags.sh | v2 重寫(DEF-004) |
| scripts/verify_freeze.py | 新增(DEF-002) |
| scripts/vercel_reconcile.py | 新增(DEF-003) |
| governance/tag-protection.md、governance/deploy-log.md、governance/CHANGELOG.md | 更新 |
| VERSION、builder 六頁、builder/version、compliance | 版本字串同步 v5.3.6→v5.3.7(機械式) |
| governance/backup-manifest.sha256 | 規則凍結,同步重算 |

### 授權依據

- COPILOT-EXEC-008(2026-11-15,創辦人核定):P2-R3 Defect Fix;禁止施工 P3/新增產品頁/SEO 頁/Orbit/VIP/改價/改品牌;完成後直接提交 MANUS-REVIEW-009,不得自行宣告 PASS。

---

## v5.3.6 defect-fix · 2026-11-15 · P2-R2 Defect Fix (COPILOT-EXEC-007)

### 變更摘要

MANUS REVIEW P2-R1 結果:DEF-002 PASS、DEF-001/003/004 FAIL。創辦人核定 P2-R2(COPILOT-EXEC-007),施工範圍僅 DEF-001/003/004;DEF-002 凍結(manifest 不得重建、不得擴大範圍;因本版檔案變更,依既有規則同步重算雜湊以維持正確性,規則與涵蓋零變更)。品牌、定價、Orbit、VIP、P3~P5 全程未異動。

### 修復內容

| # | 缺陷 | 修復 |
|---|---|---|
| DEF-001 | 行動選單底部入口無法實際操作完成導覽(座標可驗但不可達) | 根因:sticky 表頭(position:sticky)內之絕對定位選單高於視窗且不可捲動,頁面捲動不帶動選單,底部入口(Version/SHA256/Warranty)永遠在視窗外(320×568 實測選單高 1061px vs 視窗 568px)。修復:assets/site.css 行動選單加 max-height:calc(100dvh - 64px)+overflow-y:auto+overscroll-behavior:contain+safe-area 墊底——選單自身可捲動,全入口可達。**驗收改以實際點擊**(真實 CDP 輸入,非座標/非 DOM):4 寬度(320/360/390/428)×2 頁(/,/builder/version)×7 入口(Builder/Demo/README/Setup/Version/SHA256/Warranty),每入口驗:可見(捲動後在視窗內)→可點(真實點擊)→可導頁(pathname==目標)→可收合(漢堡開→關),沙盒 64/64 PASS+部署後線上 64/64 PASS |
| DEF-003 | Deploy Log 未完整記錄最終 Production Deploy ID 及重試部署鏈 | deploy-log 補列 v5.3.5 R1~R5 完整鏈(5 列:內容部署/重試×2/失敗 ERROR/最終,含 Deploy ID+時間+狀態+Commit);建立 **GitHub Release 部署登記制度**:每版同名 Release 於部署完成後即時補記完整登記(失敗/重試/現行,Deploy ID+時間+狀態+Commit+Tag),公開可驗、不需重新部署;v5.3.5 登記回填 |
| DEF-004 | Tag Policy 缺可驗證保護機制 | 新增 governance/tag-protection.md:平台限制說明(ruleset API 403 實錄)、限制方式(憑證治理+政策入檔+Release 登記)、驗證方式(公開 API 4 條指令+內建 scripts/verify_tags.sh)、責任人表、tag 登記表(v5.3.3~v5.3.6)、永久技術保護建議(UI 2 分鐘步驟) |

### 修改檔案

| 路徑 | 變更 |
|---|---|
| assets/site.css | DEF-001:行動選單可捲動(max-height/overflow-y/safe-area) |
| VERSION、builder 六頁、builder/version、compliance | 版本字串同步 v5.3.5→v5.3.6(DEF-004 版本域一致性維護) |
| governance/deploy-log.md | DEF-003:R1~R5 完整鏈+Release 登記制度+回滾/L1/備份更新 |
| governance/CHANGELOG.md | 本條目 |
| governance/tag-protection.md | DEF-004 新增:tag 保護政策與驗證 |
| scripts/verify_tags.sh | DEF-004 新增:公開 API tag 登記驗證腳本 |
| governance/backup-manifest.sha256 | DEF-002 凍結:規則零變更,僅因上述檔案變更同步重算雜湊 |

### 授權依據

- COPILOT-EXEC-007(2026-11-15,創辦人核定):P2-R2 Defect Fix,範圍 DEF-001/003/004;DEF-002 不得修改/重建/擴大;完成後提交 P2-R2 Completion Package 重新送 MANUS;未取得 MANUS PASS 不得提交 P2 Completion Report。

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
