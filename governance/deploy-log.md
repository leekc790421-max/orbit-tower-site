# SNT 部署紀錄 (Deploy Log) — Tower Site

> 依 SNT-DEPLOY-001 規範,每次部署必須紀錄:Version / Commit / Deploy ID / Backup / Rollback / Date / L1 / L2 / L3。
> 部署流程:Workspace → 沙盒驗證 → L1(紅線) → L2(Manus 覆核) → L3(總裁簽核) → Production。
> 嚴禁未經 L3 簽核直接進 Production。
> 本檔位於 tower repo 內,公開核驗 URL:https://tower.xingdeng.tw/governance/deploy-log.md
> 版本域定義(不得混用):治理文件版本 v5.1.1(創辦人核定版 PDF)/ 站體工程版本 v5.3.x(本檔、/VERSION、git tag)/ 產品包版本 v5.2.0(README、Setup 內 zip 檔名、保固卡)。
> 證據分級:公開可驗=Production 網域(https://tower.xingdeng.tw)+ /VERSION + GitHub repo/tag + 本檔 + manifest;受 SSO 保護(需 Vercel 權限)=vercel.app 部署 URL 與 Dashboard。

---

## Tower Site (orbit-tower-site) 部署紀錄

| 版本 | 日期 | Commit | Deploy ID | 環境 | L1 紅線 | L2 Manus | L3 總裁 | 狀態 |
|---|---|---|---|---|---|---|---|---|
| v5.0.0 | 2026-11-11 | 16f05407 | dpl_339z6KanPgCPxRdk91T1qzLH67j7 | Production | (事後補) | (事後補) | (事後補) | superseded |
| v5.1.0 | 2026-11-11 | abaff06a | dpl_5EZKV9Hy | Preview | ✅ PASS | FAIL(P2/P3 連動) | ⏳ | Preview |
| v5.2.0 | 2026-11-11 | 5ef885de | dpl_BThb5MLw | Preview | ✅ PASS | FAIL(P2/P3 連動) | ⏳ | Preview |
| v5.3.0 | 2026-11-11 | f415c51d | dpl_BHpW1Y4U | Preview | ✅ PASS | FAIL(T2 價格/404/證據) | ⏳ | Preview |
| v5.3.1 | 2026-11-11 | 2e774291 | dpl_7Lbdar6N | Preview | ✅ PASS | FAIL(同上) | ⏳ | Preview |
| v5.3.2 | 2026-11-11 | 35d0ac5 | dpl_7y3TWBqf | Preview | ✅ PASS | FAIL(證據層不足) | ⏳ | Preview |
| v5.3.3 | 2026-11-13 | cab67f8 | dpl_EX6nGdnZ3USxc3yTJH9EvcefhN4E | Production | ✅ PASS | ⏳ 待複查 | ✅ EXEC-ORDER-BLOCKER-001 | superseded |
| v5.3.3 後續部署 | 2026-11-13 | (無 git meta) | dpl_AS2Z3iPkBVGKdEfP1Xw5195DnKBs | Production | — | — | — | superseded(2026-11-15 補記,原漏列) |
| v5.3.4 nav closure | 2026-11-14 | 52d6722 | dpl_GiikSNpB6P93zrsWMEfjsiNQoVeM | Production | ✅ PASS | FAIL(DEF-001~004,L3-SIGN-001 覆核對象) | ✅ L3-SIGN-001 | superseded |
| v5.3.4 governance | 2026-11-14 | ef665d0 | dpl_CrjfgSM5eM4NzJeHUjhURJqduf2Q | Production | ✅ PASS | FAIL(本列為 MANUS 覆核時之現行) | ✅ L3-SIGN-001 | superseded(2026-11-15 補記,原漏列) |
| v5.3.4 DEF-001 R1 | 2026-11-14 | 9422baa(推定) | dpl_2eUABLaGG3brTr36vWPX7aUt4xkL | Production | ✅ PASS | — | ✅ L3-SIGN-001 | superseded(2026-11-15 補記,原漏列) |
| v5.3.4 DEF-001 R2 | 2026-11-14 | 026ae78(推定) | dpl_hMLb1AE3pNMZSeuBuV2ZyaZT3NHz | Production | ✅ PASS | — | ✅ L3-SIGN-001 | superseded(2026-11-15 補記,原漏列) |
| v5.3.4 defect-fix | 2026-11-14 | f0fade8 | dpl_7yipkLRPEPPUfao8jxKtuMSbqyoA | Production | ✅ PASS | FAIL→修復中→待重新覆核 | ✅ L3-SIGN-001 | superseded |
| v5.3.4 governance R2 | 2026-11-14 | ca81640 | dpl_AZSaWtwZe6hjcbfodXBHwEWZCxE2 | Production | ✅ PASS | — | ✅ L3-SIGN-001 | superseded(2026-11-15 補記,原漏列;tag v5.3.4 現指向本 commit) |
| v5.3.5 | 2026-11-15 | (本 commit = tag v5.3.5) | (本版部署 ID 見 Vercel Dashboard;Completion Package 同步記錄) | Production | ✅ PASS | ⏳ 待 MANUS 複驗 | ✅ COPILOT-EXEC-006 | Production(現行) |

**備註:**

- v5.0.0 部署時未走完整 L1/L2/L3 流程(當時流程尚未確立)。v5.1.0~v5.3.2 連續 FAIL 為 P2/P3 階段同一覆核案之遞進修復,非獨立缺失。2026-11-08~11-10 之部署早於版本編號制度,不列版本列。
- **日期校正(2026-11-15)**:v5.0.0 原標 2026-11-10、v5.3.3 原標 2026-11-12、v5.3.4 各列原標 2026-11-15,與 Vercel API 實測 createdAt 不符,已依實測校正(v5.0.0=11-11 07:46、v5.3.3=11-13 00:59、v5.3.4 全鏈=11-14 19:21~23:01 UTC)。
- **漏列補記(2026-11-15)**:v5.3.3 後續部署(dpl_AS2Z3iPk)、v5.3.4 governance(dpl_CrjfgSM,即 MANUS 覆核時之現行)、DEF-001 R1/R2(dpl_2eUABLaGG/dpl_hMLb1AE)、governance R2(dpl_AZSaWtwZ)共 5 筆已依 Vercel API 補列。
- **Deploy ID 對映精度**:本專案採 Files API 部署(無 git meta),Deploy ID 與 commit 之對映依部署時間序與內容比對;標「推定」者為時間序推定,精確對應以 Vercel Dashboard 為準(Manus 具 Dashboard 存取權)。
- **現行部署 ID 之制度性落差說明**:Deploy ID 於部署完成後始由 Vercel 產生,故本檔 v5.3.5 列以「本 commit = tag v5.3.5」定位現行部署(commit 公開可驗),實際 Deploy ID 以 Vercel Dashboard 為準並記錄於 P2-R1 Completion Package;此為制度性一行落差,非紀錄不實。
- v5.3.3 為 Manus FAIL Fix R2,補齊 404 路由別名 + 版本同步 + 合規證據公開核驗(governance/ 入 repo + git tag),經 EXEC-ORDER-BLOCKER-001(L3 覆蓋)部署至 Production。
- v5.3.4 commit 鏈:52d6722(nav closure)→ ef665d0(governance R1)→ 9422baa(DEF-001 R1)→ 026ae78(DEF-001 R2 CSS)→ f0fade8(DEF-001 R3+defect-fix)→ ca81640(governance R2)。
- **tag 位移歷史存查(DEF-004)**:tag v5.3.4 曾由 52d6722 移動至 f0fade8 再移動至 ca81640(2026-11-14 23:00 UTC),該移動違反 MANUS「保留 tag 不可變」建議,已列為缺失檢討。v5.3.4 tag 現值(ca81640)保留存查,不再移動、不覆蓋、不重寫;v5.3.5 起以新建 tag 為不可變參照,禁止移動。
- **部署 URL 分級**:v5.3.4 defect-fix 部署 URL(orbit-tower-site-juohpg350-xfls.vercel.app)等 vercel.app URL 均受 SSO 保護,需 Vercel 權限,不作公開證據;公開核驗以 Production 網域 https://tower.xingdeng.tw + /VERSION 為準。
- **L1 與 MANUS 結論差異來源註記(DEF-003)**:v5.3.4 L1 紀錄稱 agent-browser 4 viewport 手機導覽 PASS,MANUS 覆核(對象 ef665d0)量得 390px 視窗 538px 溢位而判 FAIL——兩者測試對象不同版本狀態(MANUS 測修復前、L1 測修復後),非矛盾;原紀錄未註明測試時點與對象版本,已補註。P2-R1 對 v5.3.5 之 4 viewport 回歸結果見 L1 紀錄表。

---

## 回滾紀錄

v5.3.5 部署至 Production(2026-11-15),取代 v5.3.4 governance R2(ca81640)。v5.3.4 全鏈(2026-11-14)取代 v5.3.3(2026-11-13)。v5.3.3 取代 v5.0.0(2026-11-13,EXEC-ORDER-BLOCKER-001)。

回滾目標:
- Production 回滾一階:v5.3.4 最終態 dpl_AZSaWtwZe6hjcbfodXBHwEWZCxE2(ca81640)
- Production 回滾二階:v5.3.4 defect-fix dpl_7yipkLRPEPPUfao8jxKtuMSbqyoA(f0fade8)
- Production 回滾三階:v5.3.3 dpl_EX6nGdnZ3USxc3yTJH9EvcefhN4E(cab67f8)
- Production 回滾原始:dpl_339z6KanPgCPxRdk91T1qzLH67j7(v5.0.0)
- 原始碼回滾:git checkout v5.3.5^ (即 v5.3.4=ca81640)、v5.3.3、或任意 commit

---

## 緊急停用紀錄

(尚無)

---

## 備份紀錄

| 備份 ID | 日期 | 內容 | 位置 | SHA-256 |
|---|---|---|---|---|
| production-2026-11-10 | 2026-11-10 | 四站完整快照(xingdeng/tower/orbit/vip) | /home/z/my-project/backups/production-2026-11-10/ | 各站 .sha256 檔 ✅ |
| preview-2026-11-12-v5.3.3 | 2026-11-12 | tower repo v5.3.3 快照 | /home/z/my-project/backups/preview-2026-11-12-v5.3.3/ | orbit-tower-site.sha256 ✅ |
| git-tag-v5.3.3 | 2026-11-12 | v5.3.3 commit 不可變參照 | GitHub tag v5.3.3 | git checkout v5.3.3 還原 ✅ |
| git-tag-v5.3.4 | 2026-11-14 | v5.3.4 commit(ca81640)不可變參照,保留存查 | GitHub tag v5.3.4 | git checkout v5.3.4 還原 ✅ |
| git-tag-v5.3.5 | 2026-11-15 | v5.3.5 commit 不可變參照(現行) | GitHub tag v5.3.5 | git checkout v5.3.5 還原 ✅ |

---

## L1 紅線檢查紀錄

每次部署前必跑 scripts/redline_check.py(或施工單位等效檢查,結果存 P2-R1 Completion Package)。

| 版本 | 日期 | 結果 | 備註 |
|---|---|---|---|
| v5.3.3 | 2026-11-12 | ✅ PASS | R1~R7 全清零,vercel.json + version + compliance 頁檢查通過 |
| v5.3.4 | 2026-11-14 | ✅ PASS | v5.3.4 變更僅導覽列入口(Builder/Demo/README/Setup/Version/SHA256/Warranty 連結)+ 版本字串,未觸及承諾文案。R1~R7 核心七條紅線全清零(主動接待/成效承諾/時效/監控/VIP價格/自動化承諾)。R7x 延伸防護標記 NT$7,800/13,900/24,800 為 tower repo 環境偽陽性——此為創辦人核定現行 T1/T2/T3 定價(Founder Approved Override),非舊定價外洩。實跑 redline_check.py 於 index/builder/version/t1/warranty 五頁。(日期依部署時間序校正,原標 2026-11-15) |
| v5.3.4 defect-fix | 2026-11-14 | ✅ PASS | DEF-001~004 修復僅觸及 nav CSS + burger JS + manifest + deploy-log + CHANGELOG,未觸及定價/品牌/承諾文案。R1~R7 全清零。實跑 redline_check.py + agent-browser 4 viewport(320/360/390/428px)手機導覽驗證——本紀錄之 4 viewport 測試對象為修復後內容,與 MANUS 覆核(修復前 ef665d0,量得 538px 溢位)為不同版本狀態,兩者不矛盾。(日期校正同上;測試時點註記為 DEF-003 修復項) |
| v5.3.5 | 2026-11-15 | ✅ PASS | P2-R1 變更僅觸及治理檔/版本字串/vercel.json 別名,未觸及定價(T1 NT$7,800/T2 NT$13,900/T3 NT$24,800)/品牌(光曦星樞/閣/軌/匯)/承諾文案。R1~R7 全清零。manifest 預驗證全數一致;git diff 白名單核對僅 13 檔。 |

---

## 部署流程鐵律

1. 嚴禁未經 L3 總裁簽核直接進 Production
2. 每次 commit 只 add 目標檔案(working tree 有大量未 commit 改動)
3. Vercel Git integration 失效,一律用 `vercel --yes --token $VERCEL_TOKEN` 部署 Preview,或 scripts/vercel-deploy.py(Files API,target=production,須 L3 簽核)
4. Production 嚴禁未簽核直接部署,須 L3 總裁簽核後部署/promote
5. Preview/部署 URL 受 SSO 保護,需 header bypass 測試,不作公開證據
6. 版本編號規則:禁止 latest 覆蓋,每版新號;git tag 一經公開引用即不可移動
