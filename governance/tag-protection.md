# SNT Tag Protection 政策與驗證（DEF-004, COPILOT-EXEC-007）

> 狀態：v1.0（2026-11-15，P2-R2 Defect Fix 施工範圍內建立）
> 授權：COPILOT-EXEC-007（創辦人核定）——「若平台限制無法直接建立保護規則，則需文件化說明：限制方式、驗證方式、責任人」。
> 適用：tower repo（orbit-tower-site）全部 `v*` 版本 tag；原則同樣適用其餘三站 repo。

---

## 1. 目的

git tag 為版本不可變參照（deploy-log 鐵律 6：版本編號禁止 latest 覆蓋；v5.3.4 曾遭兩次移動列為缺失檢討）。本文件建立**可覆核**的 tag 不可變治理證據，使任何覆核者（Manus、創辦人、後續施工單位）無需 Vercel/Dashboard 權限即可獨立驗證 tag 現值與保護狀態。

## 2. 平台限制說明（限制方式之一：技術面）

- GitHub Repository Rulesets（tag 規則：update / deletion 封鎖）為首選機制。2026-11-15 施工實測：以施工用 fine-grained PAT 呼叫 `POST /repos/leekc790421-max/orbit-tower-site/rulesets` 回應 **HTTP 403 "Resource not accessible by personal access token"**——該 token 具 Contents 寫入（可 push/建 Release），但未具 Administration 權限，無法建立 rulesets。
- 因此本版採**程序性管制＋公開登記**之等效治理證據；永久技術保護之建立步驟見 §6（由具 Administration 權限者執行，約 2 分鐘）。

## 3. 限制方式（等效治理證據）

1. **憑證治理**：repo push 權限僅在創辦人持有之 GitHub PAT；施工單位於每次工單借用、完工即銷毀，不留存、不寫入交付物。tag 之建立/移動/刪除僅能經由該憑證，故「未經 L3 書面核准不得移動 tag」由憑證持有權保證。
2. **政策入檔**：deploy-log「部署流程鐵律」第 6 條 + 本文件：tag 一經公開引用（deploy-log/合規頁/結案包記錄）即不可移動、不可覆蓋、不可重寫；新版本一律新建 tag。
3. **公開登記（GitHub Release）**：每個施工版本建立同名 Release，內容含 tag→commit 對照與完整部署登記表（含失敗/重試/現行 Deploy ID、時間、狀態）。Release 建立時間戳由 GitHub 記錄，公開可讀。
4. **部署登記表**：v5.3.5（P2-R1 全鏈 R1～R5，含 R3 建置失敗）與 v5.3.6（P2-R2）之完整部署鏈登記於對應 Release，並同步摘要於 deploy-log。

## 4. 驗證方式（公開、可獨立重放）

```bash
# (1) tag→commit 對照（無需任何權限）
curl -s https://api.github.com/repos/leekc790421-max/orbit-tower-site/git/ref/tags/v5.3.5
#    應回 object.sha = 2265813…（見 §5 登記表）；v5.3.4 → ca81640…；v5.3.6 → 見登記表

# (2) 一鍵全量驗證（本 repo 內建腳本,僅用公開 API）
bash scripts/verify_tags.sh

# (3) Release/部署登記表（無需任何權限）
curl -s https://api.github.com/repos/leekc790421-max/orbit-tower-site/releases/tags/v5.3.6 | jq -r .body

# (4) 不可變性實測（規則集建立後）：git push --force origin <任意sha>:refs/tags/v5.3.5 應被 GitHub 拒絕
```

## 5. Tag 登記表（tag → commit → 狀態）

| tag | commit | 建立時間 (UTC) | 狀態 |
|---|---|---|---|
| v5.3.3 | cab67f8 | 2026-11-12 | 存查（歷史版本） |
| v5.3.4 | ca81640 | 2026-11-14 23:00 | **保留存查，不得移動**（曾由 52d6722→f0fade8→ca81640 兩次移動，已列缺失檢討；輕量 tag，直接指向 commit） |
| v5.3.5 | 2265813 | 2026-11-15（P2-R1 完工） | 存查（已由 MANUS 覆核：DEF-002 PASS） |
| v5.3.6 | （本 commit = tag v5.3.6） | 2026-11-15（P2-R2 完工） | 現行施工版本 |

> 登記表以 GitHub API 即時值為準（§4 驗證方式 (1)(2)）；兩者不符即代表發生未經核准之 tag 變更，應立即依 §7 通報。

## 6. 永久技術保護（建議，由創辦人/具權限者執行）

GitHub UI：Settings → Rules → Rulesets → New ruleset → Ruleset target 選 **Tags** → Include `refs/tags/v*` → Rules 勾選 **Restrict deletions** 與 **Restrict updates** → Enforcement **Active** → Create。
或以具 `Administration` 權限之 token 呼叫：

```
POST /repos/leekc790421-max/orbit-tower-site/rulesets
{"name":"SNT tag immutability (v*)","target":"tag","enforcement":"active",
 "conditions":{"ref_name":{"include":["refs/tags/v*"],"exclude":[]}},
 "bypass_actors":[],"rules":[{"type":"deletion"},{"type":"update"}]}
```

建立後於本文件附錄補記 ruleset id 與建立時間，§4(4) 之實測即成為常態驗證項。

## 7. 責任人

| 角色 | 責任 |
|---|---|
| L3 創辦人（A.C. LEE） | tag 保護政策最高核准；PAT 持有與輪換；§6 永久保護之建立或授權 |
| 施工單位（Z.AI / Copilot） | 每次工單新建 tag（不動舊 tag）；完工後更新本登記表與 Release 登記；銷毀借用憑證 |
| Manus（L2 覆核） | 依 §4 指令獨立驗證 tag 現值、登記表一致性與（規則集建立後）保護規則有效性；異常列入覆核 FAIL |
| Copilot（日常治理） | 發現 tag 現值與登記表不符時，立即通報 L3 並於 deploy-log 緊急停用紀錄建档 |

## 8. 變更紀錄

| 版本 | 日期 | 變更 |
|---|---|---|
| v1.0 | 2026-11-15 | 依 COPILOT-EXEC-007 建立本政策（P2-R2 DEF-004）；ruleset 建立遭 403（權限不足），採 §3 等效治理證據 |
