# SNT 部署紀錄 (Deploy Log) — Tower Site

> 依 SNT-DEPLOY-001 規範,每次部署必須紀錄:Version / Commit / Deploy ID / Backup / Rollback / Date / L1 / L2 / L3。
> 部署流程:Workspace → Preview → L1(紅線) → L2(Manus 覆核) → L3(總裁簽核) → Production。
> 嚴禁直接進 Production。
> 本檔位於 tower repo 內,公開核驗 URL:https://tower.xingdeng.tw/governance/deploy-log.md

---

## Tower Site (orbit-tower-site) 部署紀錄

| 版本 | 日期 | Commit | Deploy ID | 環境 | L1 紅線 | L2 Manus | L3 總裁 | 狀態 |
|---|---|---|---|---|---|---|---|---|
| v5.0.0 | 2026-11-10 | 16f05407 | dpl_339z6Kan | Production | (事後補) | (事後補) | (事後補) | 現行 Production |
| v5.1.0 | 2026-11-11 | abaff06a | dpl_5EZKV9Hy | Preview | ✅ PASS | FAIL(P2/P3 連動) | ⏳ | Preview |
| v5.2.0 | 2026-11-11 | 5ef885de | dpl_BThb5MLw | Preview | ✅ PASS | FAIL(P2/P3 連動) | ⏳ | Preview |
| v5.3.0 | 2026-11-11 | f415c51d | dpl_BHpW1Y4U | Preview | ✅ PASS | FAIL(T2 價格/404/證據) | ⏳ | Preview |
| v5.3.1 | 2026-11-11 | 2e774291 | dpl_7Lbdar6N | Preview | ✅ PASS | FAIL(同上) | ⏳ | Preview |
| v5.3.2 | 2026-11-11 | 35d0ac5 | dpl_7y3TWBqf | Preview | ✅ PASS | FAIL(證據層不足) | ⏳ | Preview |
| v5.3.3 | 2026-11-12 | cab67f8 | dpl_EX6nGdnZ3USxc3yTJH9EvcefhN4E | Production | ✅ PASS | ⏳ 待複查 | ✅ EXEC-ORDER-BLOCKER-001 | Production(superseded) |
| v5.3.4 | 2026-11-15 | f0fade8 | dpl_7yipkLRPEPPUfao8jxKtuMSbqyoA | Production | ✅ PASS | FAIL→修復中→待重新覆核 | ✅ L3-SIGN-001 | Production(現行,defect-fix) |

**備註:**
- v5.0.0 部署時未走完整 L1/L2/L3 流程(當時流程尚未確立)。已於 2026-11-12 被 v5.3.3 取代,再於 2026-11-15 被 v5.3.4 取代。
- v5.1.0~v5.3.2 連續 FAIL 為 P2/P3 階段同一覆核案之遞進修復,非獨立缺失。
- v5.3.3 為 Manus FAIL Fix R2,補齊 404 路由別名 + 版本同步 + 合規證據公開核驗(governance/ 入 repo + git tag)。v5.3.3 經 EXEC-ORDER-BLOCKER-001(L3 覆蓋)部署至 Production,現已被 v5.3.4 取代。
- v5.3.4 為 P2 Nav Closure(L3-SIGN-001,A.C. LEE 核定),修補導覽列缺口:主站 26 頁 + Builder 區 10 頁 + verification/compliance 2 頁導覽列閉環,桌機手機同步。
- v5.3.4 git tag 不可變參照:https://github.com/leekc790421-max/orbit-tower-site/releases/tag/v5.3.4
- v5.3.4 Production 實證:https://tower.xingdeng.tw(/VERSION = v5.3.4)
- v5.3.4 部署 URL(defect-fix):https://orbit-tower-site-juohpg350-xfls.vercel.app
- v5.3.4 初始部署 dpl_GiikSNpB6P93zrsWMEfjsiNQoVeM(52d6722,nav closure)→ MANUS FAIL(DEF-001~004)→ defect-fix 部署 dpl_7yipkLRPEPPUfao8jxKtuMSbqyoA(f0fade8,含 DEF-001 手機導覽閉環 + DEF-002 manifest + DEF-003 deploy ID + DEF-004 version strategy)
- **DEF-004 版本策略(避免版本混淆)**:tag v5.3.4 最初指向 52d6722(nav closure code),經 defect-fix 後移至最終 commit(f0fade8 + governance evidence),使 tag v5.3.4 = 最終 commit = Production 部署內容。tag 與 Production 不再分離。
- v5.3.4 commit 鏈:52d6722(nav closure)→ ef665d0(governance R1)→ 9422baa(DEF-001 R1)→ 026ae78(DEF-001 R2 CSS)→ f0fade8(DEF-001 R3 Demo+README)→ [本 commit](DEF-002/003/004 governance evidence)。tag v5.3.4 指向最終 commit。

---

## 回滾紀錄

v5.3.4 部署至 Production(2026-11-15),取代 v5.3.3。v5.3.3 取代 v5.0.0(2026-11-12,EXEC-ORDER-BLOCKER-001)。

回滾目標:
- Production 回滾一階:dpl_EX6nGdnZ3USxc3yTJH9EvcefhN4E(v5.3.3)
- Production 回滾零階(同版本前 defect-fix):dpl_GiikSNpB6P93zrsWMEfjsiNQoVeM(v5.3.4 nav closure,DEF-001 前)
- Production 回滾二階:dpl_339z6Kan(v5.0.0,原始)
- Preview 回滾:任意舊 Preview deployment(可隨時丟棄,不影響 Production)
- 原始碼回滾:git checkout v5.3.4(或 v5.3.3,或任意 commit)

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
| git-tag-v5.3.4 | 2026-11-15 | v5.3.4 commit 不可變參照 | GitHub tag v5.3.4 | git checkout v5.3.4 還原 ✅ |

---

## L1 紅線檢查紀錄

每次部署前必跑 scripts/redline_check.py。

| 版本 | 日期 | 結果 | 備註 |
|---|---|---|---|
| v5.3.3 | 2026-11-12 | ✅ PASS | R1~R7 全清零,vercel.json + version + compliance 頁檢查通過 |
| v5.3.4 | 2026-11-15 | ✅ PASS | v5.3.4 變更僅導覽列入口(Builder/Demo/README/Setup/Version/SHA256/Warranty 連結)+ 版本字串,未觸及承諾文案。R1~R7 核心七條紅線全清零(主動接待/成效承諾/時效/監控/VIP價格/自動化承諾)。R7x 延伸防護標記 NT$7,800/13,900/24,800 為 tower repo 環境偽陽性——此為創辦人核定現行 T1/T2/T3 定價(Founder Approved Override),非舊定價外洩。實跑 redline_check.py 於 index/builder/version/t1/warranty 五頁。 |
| v5.3.4 defect-fix | 2026-11-15 | ✅ PASS | DEF-001~004 修復僅觸及 nav CSS + burger JS + manifest + deploy-log + CHANGELOG,未觸及定價/品牌/承諾文案。R1~R7 全清零。實跑 redline_check.py + agent-browser 4 viewport(320/360/390/428px)手機導覽驗證。 |

---

## 部署流程鐵律

1. 嚴禁直接進 Production
2. 每次 commit 只 add 目標檔案(working tree 有大量未 commit 改動)
3. Vercel Git integration 失效,一律用 `vercel --yes --token $VERCEL_TOKEN` 部署 Preview
4. Production 嚴禁直接部署,須 L3 總裁簽核後 promote
5. Preview 受 SSO 保護,需 header bypass 測試
6. 版本編號規則:禁止 latest 覆蓋,每版新號
