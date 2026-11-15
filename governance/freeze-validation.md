# SNT Freeze Validation Report（DEF-002, COPILOT-EXEC-008）

> 建立日期：2026-11-15（P2-R3 Defect Fix, v5.3.7）
> 授權：COPILOT-EXEC-008（創辦人核定；MANUS-REVIEW-008 判定「Freeze Coverage 存在變動」,要求列出 P2-R1/P2-R2/P2-R3 三版 Coverage Diff／Exclusion Diff／Rules Diff,說明何處變動、是否為誤變動、是否需回復）
> 凍結原則（自 v5.3.5 定稿,MANUS REVIEW P2-R1 DEF-002 PASS）：manifest 之涵蓋規則/排除規則/檔頭說明**凍結不得重建**；版本內容檔案經核定變更時,依既有規則**同步重算雜湊**（v5.3.5 manifest 檔頭即載明「最終部署後重新生成」管線）;新增治理檔依涵蓋規則（「部署輸出之全部檔案」）自動納入。
> 重放：`python3 scripts/verify_freeze.py`（git refs v5.3.4/v5.3.5/v5.3.6 + 工作區,純 git 依賴）。

---

## 1. 結論摘要（逐版判定）

| 版本邊界 | Coverage 變動 | Exclusion 變動 | Rules 變動 | 核定依據 | 誤變動？ | 需回復？ |
|---|---|---|---|---|---|---|
| P2-R1（v5.3.4→v5.3.5） | 108→139 條（+48/−17） | **有**：新增排除 api/*（12 檔,不對外服務,404 實測驗證）、package.json/package-lock.json、sitemap.xml（建置正規化）、vercel.json（建置正規化,語義一致驗證）、A39C0B14…txt（dotfile 類）；.github/* 與 dotfile 於檔頭規則明示 | **有**：檔頭規則整體重寫定稿（涵蓋規則改為「部署輸出之全部檔案」+排除清單+api/* 檢核附錄 12 條+VERSION 納入聲明） | COPILOT-EXEC-006（P2-R1 核准 manifest 重建）；**MANUS REVIEW P2-R1 已判 DEF-002 PASS** | 否 | 否（已覆核通過之基線） |
| P2-R2（v5.3.5→v5.3.6） | 139→141 條（+2,見 §2.2） | **零** | **零**（唯一差異=計數行「共 139 檔」→「共 141 檔」）；55 檔 hash 重算（核定修改：site.css 修復+43 檔 cache-bust 單行+版本字串/治理檔更新） | COPILOT-EXEC-007（DEF-002 凍結+重算許可） | 否 | 否 |
| P2-R3（v5.3.6→v5.3.7） | 141→146 條（+5 驗證檔,見 §2.3）；13 檔 hash 重算（與 scripts/verify_freeze.py 實測一致） | **零** | **零**（唯一差異=計數行→「共 146 檔」） | COPILOT-EXEC-008（允許修改：治理文件/Release Registry/Deploy Log/Tag Validation/Freeze Rules/相關驗證檔案） | 否 | 否 |
| P2-R4（v5.3.7→v5.3.8） | 146→146 條（+0/−0,無新檔）；15 檔 hash 重算（scripts/verify_freeze.py v2 實測;git 檔案層級另含 manifest 本檔重算,共 16 檔——manifest 自我排除不入條目集） | **零** | **零**（唯一差異=計數行不變→「共 146 檔」不變） | MANUS-REVIEW-009 FAIL 之缺失修復（治理驗證檔範圍） | 否 | 否 |
| P2-R5（v5.3.8→v5.3.9） | 146→149 條（+3 驗證/存證檔:scripts/deploy_chain_audit.py、governance/deploy-replay-2026-11-15.txt、governance/freeze-replay-2026-11-15.txt）；15 檔 hash 重算（實測=verify_freeze.py v2 工作區段;git 層級另含 manifest 本檔重算） | **零** | **零**（唯一差異=計數行→「共 149 檔」） | Manus P2-R4 複查修繕方案（DEF-002 工具補強+DEF-003 部署鏈重建;治理/驗證檔範圍） | 否 | 否 |
| P2-R6（v5.3.9→v5.3.10） | 149→149 條（+0/−0,無新檔）；18 檔 hash 重算（實測=verify_freeze.py v2 工作區段:工具修正+雙存證重生成+版本字串+治理檔;freeze-replay 自參照列入） | **零** | **零**（唯一差異=計數行不變→「共 149 檔」不變） | 自行覆核①發現:deploy_chain_audit.py 內容核實候選取樣漏列 :MANIFEST 路徑致存證判定行失真;依 Manus 方案③以新版本發佈修正,不覆寫 v5.3.9 | 否 | 否 |

**P4 併行施工聲明（2026-11-15,P4 啟動後生效）**：P2/P3 已結案（v5.3.10 取得 Manus PASS）。P4 Orbit Productization 施工起，scripts/verify_freeze.py 升級 **P4 併行模式**：immutable tag 鏈止於 v5.3.10（六段硬性斷言不變，v5.3.9→v5.3.10 段=上列 P2-R6 核定差異），工作區段改為「**Tower 交付態逐檔硬驗**」——以 v5.3.10 manifest 之 149 檔逐檔 sha256 硬驗，僅 **P4 起點核定工具調整 3 檔**可異動（scripts/verify_freeze.py、governance/freeze-validation.md、governance/freeze-replay-2026-11-15.txt），其餘 146 檔零變更；工作區新增限 `orbit-site/**`（P4 Orbit 站體，部署至獨立 Vercel 專案），零移除。Tower 線上交付態不受 P4 施工影響。

**本報告即「核准差異清單」之申請件**：上表所列全部差異均為上述三張核定令授權範圍內之變更,無任何未授權條目變動（誤變動=0）。請 MANUS 核准本清單;核准後,v5.3.7 manifest 即為新凍結基線,後續版本對其遵循 ZERO-RULES-DIFF。

## 2. Coverage Diff 詳列

### 2.1　P2-R1：v5.3.4（108 條）→ v5.3.5（139 條）

- **+48**：此為涵蓋規則由「部分清單」改為「部署輸出全部檔案」後補齊之既有部署檔案（並非新增部署檔案）：`.marker`、`3d/`（3 檔）、`assets/`（logo/cover/og 等 5 檔）、`assets/promo/`（14 檔）、`assets/shots/`（15 檔）、`scripts/vercel-deploy.py`、`verification/screenshots/`（10 檔）。
- **−17**：改列排除（見 §3.1）。
- **hash 變更 14**：P2-R1 核定修改之檔案（VERSION、builder 六頁、builder/version、compliance、deploy-log、CHANGELOG、showcase 三頁版本字串）。

### 2.2　P2-R2：v5.3.5（139 條）→ v5.3.6（141 條）

- **+2**：`governance/tag-protection.md`、`scripts/verify_tags.sh`——COPILOT-EXEC-007 DEF-004 之核定交付物,依涵蓋規則自動納入。
- **hash 變更 55**：`assets/site.css`（DEF-001 修復）+ 43 個 HTML 之 `?v=5.3.6` cache-bust 單行差異（交付必要措施,git diff 逐檔核驗）+ 版本字串同步與治理檔更新。

### 2.3　P2-R3：v5.3.6（141 條）→ v5.3.7（146 條,本版）

- **+5 新檔**（依 scripts/verify_freeze.py 實測清單）：`governance/freeze-validation.md`（本檔）、`governance/deployment-registry.md`（DEF-003 SSOT）、`governance/tag-registry.txt`（DEF-004 期望值登記）、`scripts/vercel_reconcile.py`（DEF-003）、`scripts/verify_freeze.py`（DEF-002）。全部屬 COPILOT-EXEC-008 允許修改清單。
- **hash 變更 13**（實測清單）：VERSION+builder 六頁+builder/version+compliance（版本字串 v5.3.6→v5.3.7 機械同步）、deploy-log、CHANGELOG、tag-protection.md、verify_tags.sh（v2 重寫,屬重算列非新檔）。

## 3. Exclusion Diff 詳列

### 3.1　P2-R1 定稿之排除規則（自 v5.3.5 起,至 v5.3.7 零變更）

| 排除對象 | 理由 | 驗證 |
|---|---|---|
| `api/*`（12 檔） | 不對外服務（部署環境 404 實測）;納入檔頭「api 檢核附錄」逐檔登記 SHA 供內容存查 | 附錄 12 條,MANUS 可重放 |
| `vercel.json` | 部署態被 Vercel 建置正規化（name/version 鍵）,語義一致已驗證;收錄將造成假性不一致 | R3 ERROR 事件與 R4 驗證紀錄 |
| `sitemap.xml` | 建置正規化生成 | 同上性質 |
| `package.json`、`package-lock.json` | 建置工件,不屬部署輸出內容 | — |
| dotfile（3 檔） | 非對外服務 | — |
| `.github/*` | repo 工作流檔案,不對外服務（部署環境 404 實測） | v5.3.5 R5 驗證紀錄 |

### 3.2　P2-R2／P2-R3

- **零變更**。排除清單與附錄規則逐字一致（`python3 scripts/verify_freeze.py` 可重放：兩版僅計數行差異）。

## 4. Rules Diff 詳列（檔頭規則）

- **P2-R1**：檔頭整體重寫定稿（涵蓋規則措辭、排除清單、api 附錄 12 條、VERSION 納入聲明）——P2-R1 核定範圍,已由 MANUS REVIEW 判 DEF-002 PASS。
- **P2-R2／P2-R3**：規則文字零變更;唯一逐行差異為計數行「共 N 檔」（139→141→146）。
- 沿用說明：檔頭「含 VERSION 與 governance 三檔」為 v5.3.5 定稿時之措辭（當時 governance 恰為三檔）。因規則凍結,此措辭未隨 governance 檔案數增長而改寫;實際涵蓋規則為同句之「部署輸出之全部檔案」,新治理檔依此自動納入——措辭保留、規則效力不變,特此說明。

## 5. 重現指令（MANUS 可獨立執行）

```bash
# 一鍵三版+工作區差異重放（純 git,公開 repo 可自行 clone）
python3 scripts/verify_freeze.py

# 或逐步:
git show v5.3.5:governance/backup-manifest.sha256 > /tmp/m535.txt
git show v5.3.6:governance/backup-manifest.sha256 > /tmp/m536.txt
git show v5.3.7:governance/backup-manifest.sha256 > /tmp/m537.txt
diff /tmp/m535.txt /tmp/m536.txt   # 應僅:+2 新檔/55 重算/計數行
diff /tmp/m536.txt /tmp/m537.txt   # 應僅:+5 新檔/14 重算/計數行
# live 一致性:
curl -s https://tower.xingdeng.tw/governance/backup-manifest.sha256 | sha256sum -c --quiet  # 或逐檔比對
```

## 6. 變更紀錄

| 版本 | 日期 | 變更 |
|---|---|---|
| v1.0 | 2026-11-15 | 依 COPILOT-EXEC-008 建立（P2-R3 DEF-002）：三版 Diff、誤變動判定（0 筆）、核准差異清單申請 |
| v1.5 | 2026-11-15 | 自我覆核輪（GEMINI-ORDER-SELF-REVIEW）:WORKTREE_LABEL 更新 v5.4.1;P4 併行聲明數值複核——實測 146/149 零變更+3 核定調整+新增 13（限 orbit-site/**）+零移除,與聲明一致;存證重跑 |
| v1.6 | 2026-11-15 | FAIL 排查修正輪（MANUS-REVIEW-RESULT: FAIL）:WORKTREE_LABEL 更新 v5.4.2;quote 摘要遞送 UI 修復;新增 orbit-site/favicon.ico（logo 向量轉製,直接請求路徑補齊）→新增檔數 13→14（仍限 orbit-site/**,聲明範圍不變）;version 頁尾滯留 v5.4.0 漏網缺陷修正;存證重跑 |
| v1.7 | 2026-11-15 | P4 正式上線遺留項補齊輪（MANUS-REVIEW-RESULT: PASS＋整合執行令）:WORKTREE_LABEL 更新 v5.4.3;og:image 補齊（og.png 1200×630+五頁 meta 絕對 URL）+正式聯絡通道（service@xingdeng.tw,主站既有公開資訊）;gen_manifest.py 檔尾換行修復——VERSION 條目自 v5.4.0 起黏附檔頭 "#" 行致解析誤濾（檔案本身恆完整）,修復後 14 檔全數可解析驗證;新增檔數 14→15（og.png,仍限 orbit-site/**）;正式部署 orbit.xingdeng.tw（域名切換事實登記見 orbit deploy-log §8）;存證重跑 |
| v1.8 | 2026-11-15 | P5 啟動（MANUS-REVIEW-RESULT: PASS＋整合執行令＋P5 規格追加令）:WORKTREE_LABEL 更新 v5.5.0;**工作區新增範圍擴展 orbit-site/** → orbit-site/**+vip-site/****（P5 vip 站 vip-site/ 建置,沙盒隔離,vip.xingdeng.tw 正式域 PASS 前零碰觸——現由既有專案 cosmosphere-vip 服務,已取證）;Tower 交付態 146/149 零變更+3 核定調整不變;存證重跑 |
| v1.9 | 2026-11-15 | P4 視覺規格變更輪（GEMINI-GOV-ADDENDUM）:WORKTREE_LABEL 更新 v5.4.4;orbit-site/** 新增 assets/geometry.js（動態幾何背景層,零外部依賴）→新增檔數 15→16（限 orbit-site/**+vip-site/**）;site.css 亮藍換膚+og.png 換膚;Tower 交付態 146/149 零變更+3 核定調整不變;正式部署 orbit.xingdeng.tw dpl_72PVWn4G…（live 11/11）;存證重跑 |
| v1.10 | 2026-11-15 | SNT_v5.1.2 綜合管考布告收訊（GEMINI-GOV-NOTICE）全線治理錨定對帳（零站體變更,無新 tag,v5.4.4 錨點不動）:①四站品牌命名實測=xingdeng.tw 光曦星樞/tower.xingdeng.tw 光曦星閣/orbit.xingdeng.tw 光曦星軌/P5 沙盒 光曦星匯;②定價鐵律 T1 7,800/T2 13,900/T3 24,800 實測=Tower 凍結 tag v5.3.10 內 builder/packages(t1/t2/t3)+報價 API 共 8/12/9 檔,值與鐵律一致;P5 沙盒 /membership/ 三值各 3 次;Orbit 依企業總部定位不帶零售級距;/pricing/ 公開基準價(1,980/3,500/9,800/300,000)屬 v5.3.10 凍結核定產品線;③版本態=tower live v5.3.10/orbit live v5.4.4/P5 沙盒 v5.5.0 存續/vip.xingdeng.tw 既有服務 200 零碰觸;④保護線重放全綠=Orbit L1 34 項/Tower L1 全過/freeze 146/149+3 核定調整/verify_tags 7 PINNED;⑤狀態校正=P5 v5.5.0 業已完成 L1 32 項+L2 E2E 並提交 Manus 覆核（布告所載「建置中」為較早狀態）;本列僅治理登記,orbit-site/** 與 vip-site/** 零變更 |
| v1.11 | 2026-11-15 | v5.5.1 P5 沙盒修復輪（MANUS-REVIEW-RESULT: FAIL 攔截後點對點修復）:M1 crystal.js v2.0（矩陣預分配零逐幀配置實作/FPS 自適應降級 qlv0→3 寬限+脈衝豁免/pointercancel 歸位/prefers-reduced-motion JS+CSS 雙軌/sessionStorage contextlost 恢復防迴圈/powerPreference=default）;M2 跨站定價閉環收斂（data-tier 三卡/JSON-LD AggregateOffer TWD 7800-13900-24800/Tower t1-t2-t3 對照導流(目標頁 live 200 實測)/appointment ?plan= URLSearchParams 預填+prefilled/五頁頁腳主站誤標修正 光曦星軌→光曦星樞）;M3 manifest 規則頭 v5.5.1 重生+L1 內嵌資源閉環檢查;五頁版字 v5.5.1;Vip L1 32→46 項全綠;Tower L1 R-P5 同步 v5.5.1+R-範圍 vip-site/** 管轄移轉（比照 P4 orbit-site/** 慣例）;Tower/Orbit 站體零變更（P4 v5.4.4 現狀,隔離紅線）;沙盒重部署待 VERCEL_TOKEN 重建（R1-c v5.5.0 續服務為覆核基準）,L2 E2E 以本地沙盒等價環境取證 | 存證重跑 |
| v1.4 | 2026-11-15 | P4 併行聲明+工具 P4 併行模式:鏈延至 v5.3.10（六段 immutable tag 硬性斷言）;工作區段改 Tower 交付態逐檔硬驗（146 檔零變更+3 檔核定調整）+工作區新增限 orbit-site/**+零移除 |
| v1.3 | 2026-11-15 | P2-R6（自行覆核①工具修正輪）:新增 P2-R6 列;verify_freeze.py 鏈延長——六 immutable tag v5.3.4→v5.3.9（新增 v5.3.8→v5.3.9 段硬性斷言=+3/−0/15 檔）+工作區 v5.3.10（無新增/無移除/規則零差異）;freeze-replay 存證重跑 |
| v1.2 | 2026-11-15 | P2-R5（Manus P2-R4 複查修繕方案④）:P2-R4 列補實測值（16 檔）;新增 P2-R5 列;scripts/verify_freeze.py 升級 v2——五點鏈 v5.3.4→v5.3.8+工作區、四段 immutable tag 硬性斷言（條目/新增/移除/hash 變更/規則差異,不符即 exit 1）、工作區結構斷言;重跑輸出存證 governance/freeze-replay-2026-11-15.txt |
| v1.1 | 2026-11-15 | P2-R4（MANUS-REVIEW-009 FAIL 修復）：§1「14 檔」筆誤更正為 13（與 verify_freeze.py 實測一致）、§2.3 新增/重算清單改附實測清單、新增 P2-R4 列 |
