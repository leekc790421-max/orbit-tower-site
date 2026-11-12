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
| v5.3.3 | 2026-11-12 | tag v5.3.3 | (Preview URL) | Preview | ✅ PASS | ⏳ 待複查 | ⏳ | Preview(本版) |

**備註:**
- v5.0.0 部署時未走完整 L1/L2/L3 流程(當時流程尚未確立)。此為現行 Production,未變更。
- v5.1.0~v5.3.2 連續 FAIL 為 P2/P3 階段同一覆核案之遞進修復,非獨立缺失。
- v5.3.3 為 Manus FAIL Fix R2,補齊 404 路由別名 + 版本同步 + 合規證據公開核驗(governance/ 入 repo + git tag)。
- v5.3.3 以 git tag 為 commit 不可變參照:https://github.com/leekc790421-max/orbit-tower-site/releases/tag/v5.3.3
- v5.3.3 Preview 實證:https://orbit-tower-site-2keqmizmz-xfls.vercel.app

---

## 回滾紀錄

(尚無。Production 仍為 v5.0.0,未 promote 任何 Preview 版本。)

回滾目標:
- Production 回滾:dpl_339z6Kan(v5.0.0,現行)
- Preview 回滾:任意舊 Preview deployment(可隨時丟棄,不影響 Production)
- 原始碼回滾:git checkout v5.3.3(或任意 commit)

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

---

## L1 紅線檢查紀錄

每次部署前必跑 scripts/redline_check.py。

| 版本 | 日期 | 結果 | 備註 |
|---|---|---|---|
| v5.3.3 | 2026-11-12 | ✅ PASS | R1~R7 全清零,vercel.json + version + compliance 頁檢查通過 |

---

## 部署流程鐵律

1. 嚴禁直接進 Production
2. 每次 commit 只 add 目標檔案(working tree 有大量未 commit 改動)
3. Vercel Git integration 失效,一律用 `vercel --yes --token $VERCEL_TOKEN` 部署 Preview
4. Production 嚴禁直接部署,須 L3 總裁簽核後 promote
5. Preview 受 SSO 保護,需 header bypass 測試
6. 版本編號規則:禁止 latest 覆蓋,每版新號
