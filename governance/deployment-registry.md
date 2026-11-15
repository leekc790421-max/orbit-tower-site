# SNT Deployment Registry（部署登記單一權威來源 / Single Source Of Truth）

> 建立：P2-R3 Defect Fix（COPILOT-EXEC-008 / MANUS-REVIEW-008 判定 DEF-003：Release Registry 與 Vercel Deploy History 不一致）
> 狀態：v1.0（2026-11-15）
> 權威序：**本檔 = SSOT**；同名 GitHub Release = 公開唯讀鏡像（無 Vercel 權限者之驗證入口）；deploy-log = 敘事與政策檔。三者如有出入，以本檔為準，並視為缺陷立即處理。
> 產生方式：`VERCEL_TOKEN=*** python3 scripts/vercel_reconcile.py`（唯讀 API，可重放）。本檔治理期數據取自 2026-11-15 實測輸出（歷經 v5.3.7 鏈 2 筆→166、v5.3.8 鏈 2 筆→168、v5.3.9 本鏈 1 筆→169,均已更新至 §1/§2;查證當下全量以重放輸出為準,部署鏈重建與內容核實工具=scripts/deploy_chain_audit.py,存證=governance/deploy-replay-2026-11-15.txt）。

---

## 1. 部署史總覽（Vercel Deploy History 全量對帳）

| 分期 | 期間 | 筆數 | READY | ERROR | BLOCKED | 登記方式 |
|---|---|---|---|---|---|---|
| 前治理期 | 2026-10-16 ~ 2026-11-08 | 147 | 136 | 9 | 2 | §3 彙總登記（無 tag/git 對應,異常筆逐筆列 ID） |
| 治理期（v5.3.3 起） | 2026-11-13 ~ 現在 | 22（至 v5.3.9 交付,含本鏈 1 筆） | 21 | 1 | 0 | §2 逐筆登記 |
| 合計 | — | **169**（v5.3.9 交付後全量,含本鏈;驗收時以 scripts/deploy_chain_audit.py 當時重放輸出核對,不沿用舊快照數字） | 157 | 10 | 2 | — |

> **MANUS-REVIEW-008 不一致之根因與修復**：此前 Release Registry（v5.3.5/v5.3.6）僅登記該兩版之部署鏈（9 筆），未涵蓋 v5.3.3/v5.3.4 鏈（8 筆）與前治理期（147 筆），與 Vercel Deploy History 全量 164 筆對帳自然不一致。本檔建立後：治理期 17 筆全量逐筆登記（含補建 Release v5.3.3/v5.3.4），前治理期以彙總＋異常逐筆方式登記，對帳差異歸零。

## 2. 治理期部署登記（逐筆；Timestamp=Vercel API createdAt,UTC；Commit 欄之 n/a=files-API 部署不帶 git metadata,commit 對應由 deploy-log 工作紀錄與 tag/內容驗證確立）

### v5.3.3 鏈（2026-11-13;tag v5.3.3 = cab67f8;Release: github.com/leekc790421-max/orbit-tower-site/releases/tag/v5.3.3,2026-11-15 補建）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| 1 | dpl_EX6nGdnZ3USxc3yTJH9EvcefhN4E | 2026-11-13 00:59:30 | READY | cab67f8（n/a→工作紀錄） | v5.3.3 | superseded |
| 2 | dpl_AS2Z3iPkBVGKdEfP1Xw5195DnKBs | 2026-11-13 01:02:32 | READY | cab67f8 = tag v5.3.3 | v5.3.3 | superseded by v5.3.4 |

### v5.3.4 鏈（2026-11-14;tag v5.3.4 = ca81640;Release: .../releases/tag/v5.3.4,2026-11-15 補建；敘事見 deploy-log v5.3.4 段）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| 1 | dpl_GiikSNpB6P93zrsWMEfjsiNQoVeM | 2026-11-14 19:21:25 | READY | （R1;n/a） | v5.3.4 | superseded |
| 2 | dpl_CrjfgSM5eM4NzJeHUjhURJqduf2Q | 2026-11-14 19:25:23 | READY | （R2;n/a） | v5.3.4 | superseded |
| 3 | dpl_2eUABLaGG3brTr36vWPX7aUt4xkL | 2026-11-14 22:52:51 | READY | （governance 修回歸 G1;n/a） | v5.3.4 | superseded |
| 4 | dpl_hMLb1AE3pNMZSeuBuV2ZyaZT3NHz | 2026-11-14 22:56:24 | READY | （G2;n/a） | v5.3.4 | superseded |
| 5 | dpl_7yipkLRPEPPUfao8jxKtuMSbqyoA | 2026-11-14 22:58:12 | READY | （G3;n/a） | v5.3.4 | superseded |
| 6 | dpl_AZSaWtwZe6hjcbfodXBHwEWZCxE2 | 2026-11-14 23:01:02 | READY | ca81640 = tag v5.3.4（最終） | v5.3.4 | superseded by v5.3.5 |

### v5.3.5 鏈（2026-11-15;tag v5.3.5 = 2265813;Release: .../releases/tag/v5.3.5；P2-R1,COPILOT-EXEC-006）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| R1 內容部署 | dpl_7zRQpXpXnUaTNYtzB7qP8VMMkYqi | 2026-11-15 00:07:51 | READY | d7fcd8c | v5.3.5 | superseded |
| R2 重試 | dpl_F3cXrzszaBXq2FLG5X52A8psZcyc | 2026-11-15 00:10:43 | READY | 5645d74 | v5.3.5 | superseded |
| R3 重試（失敗） | dpl_2cV8zEiC1xB6UjSQCEETAVLs1Mju | 2026-11-15 00:14:26 | **ERROR** | ffc9441 | v5.3.5 | 未上線（vercel.json schema 拒絕 caseSensitive） |
| R4 重試 | dpl_Dh52eCgduTy61cH3m3UfvnnBqfPJ | 2026-11-15 00:17:56 | READY | df5b44f | v5.3.5 | superseded |
| R5 最終 | dpl_EsNZSj64yKsH9CdUksaRSZ1THnVK | 2026-11-15 00:20:17 | READY | 2265813 = tag v5.3.5 | v5.3.5 | superseded by v5.3.6 |

### v5.3.6 鏈（2026-11-15;tag v5.3.6 = a6772ab;Release: .../releases/tag/v5.3.6；P2-R2,COPILOT-EXEC-007）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| R1 內容部署 | dpl_F8HNArEf1Y9mM2HiuUmt8khaFD2b | 2026-11-15 01:31:24 | READY | 05c19a1 | v5.3.6 | superseded |
| R2 cache-bust 修正 | dpl_J5qt2THBw19Kd7hoB3G5pesenfUk | 2026-11-15 01:39:12 | READY | a887ed8 | v5.3.6 | superseded |
| R2b 中間部署（未 commit 工作區,內容等同 R3 之腳本修正） | dpl_359GUPMyM2i6S8FxZ7bkv23xSr2S | 2026-11-15 01:43:14 | READY | （無 commit） | v5.3.6 | superseded |
| R3 驗證腳本修正（最終） | dpl_5GFdJW9xDH58ad4jvTArFczUWv8s | 2026-11-15 01:44:16 | READY | a6772ab = tag v5.3.6 | v5.3.6 | **superseded by v5.3.7（交付時）** |

### v5.3.7 鏈（P2-R3,COPILOT-EXEC-008;tag v5.3.7 = cd1e4f05d0a0e1a8d07d7819b0372a69c3f88034,已 PINNED）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| R1 內容部署 | dpl_CFKXtbwdhK7kEq1vnWx3g1D8d4To | 2026-11-15 02:43:36 | READY | f154cff | v5.3.7 | superseded |
| R2 驗證腳本 CURRENT 列修補（最終） | dpl_HDF7wwGJ73vQoi1HPhra6jnRmqxS | 2026-11-15 02:45:51 | READY | cd1e4f0 = tag v5.3.7 | v5.3.7 | **superseded by v5.3.8（交付時）** |

### v5.3.8 鏈（P2-R4,MANUS-REVIEW-009 FAIL 修復;依 Manus P2-R4 複查修繕方案①②重建）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| R1 內容部署 | dpl_FcfPbs9PET9yJS2jaa14pR8pbKo9 | 2026-11-15 03:28:20 | READY | 77924c1（工作紀錄時序對應※;內容層級未能追溯） | v5.3.8 | superseded |
| R2 釘死值解析容錯（最終） | dpl_A98SQNRUFfZzfh8KqsuorgF6Lw79 | 2026-11-15 03:30:26 | READY | 0d439d1 = tag v5.3.8 = main HEAD（內容雜湊核實✓） | v5.3.8 | **superseded by v5.3.9（交付時）** |

※ **v5.3.8 鏈核實附註**（工具=scripts/deploy_chain_audit.py）：部署 meta 無 git 綁定（僅 lambdaRuntimeStats）→ 部署來源欄 n/a。**內容核實**：production 域名（tower.xingdeng.tw,公開）之 manifest sha256=`40a51dbd65c180d0…`＝git blob 0d439d11f1a831bf4783efe6312651068f5bf705 ✓（R2 為現行 production 時點）。R1 之部署唯一 URL（orbit-tower-site-76lg76ft8-xfls.vercel.app）受 Vercel Deployment Protection 保護（HTTP 302 SSO）、Vercel Files API 未回列靜態檔 → 內容層級**未能追溯**;commit 歸屬依 deploy-log 工作紀錄與部署建立時序（77924c1 push 後 1 分鐘內建立）對應,屬工作紀錄對應、非內容核實,依覆核指示不猜填、標記如上。Alias：Vercel 物件 alias=null（CLI 部署不保留歷史別名）;production alias（tower.xingdeng.tw）於本鏈期指向 R2。

### v5.3.9 鏈（P2-R5,Manus P2-R4 複查修繕方案）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| 部署鏈 | 現行筆見 Release v5.3.9 之部署登記（交付時補記,機制見下行聲明） | — | — | tag v5.3.9 | v5.3.9 | 見 Release v5.3.9 |

> **現行筆登記機制（一行落差規則之正式化）**：Deploy ID 於部署完成後始由 Vercel 產生,「載送本檔之部署」無法在部署前自載其 ID——故本檔對**歷史輪次逐筆實登記**（含 Deploy ID/Timestamp/State/Commit,如上 v5.3.7/v5.3.8 鏈）,僅「現行施工版之最後一筆」以「見同名 Release 部署登記」表示;該 Release 於交付後即時補記（不需重新部署）。查證順序:本檔（歷史）→同名 Release（現行筆）→ Vercel API 重放（全量）→ 線上 /VERSION（production 現況）。

## 3. 前治理期彙總（2026-10-16 ~ 2026-11-08,147 筆）

- 性質：治理制度（SNT-GOV-001/deploy-log/tag）建立之前之迭代部署；全數為 files-API 部署（無 git/tag 對應可考證）,本檔以彙總方式登記,不作逐筆 commit 映射（無法核實者不虛構）。
- 構成：READY 136、ERROR 9、BLOCKED 2。
- **異常筆逐筆登記（誠實揭露）**：

| Deploy ID | Timestamp (UTC) | State | 備註 |
|---|---|---|---|
| dpl_4UMhnqiNzePhKsEaxBHBC1yZmFUG | 2026-10-23 10:34:37 | ERROR | 前治理期建置失敗 |
| dpl_433aY3xdGfChFDWwMhYTHQ2eaPDL | 2026-10-25 11:52:59 | BLOCKED | 部署保護攔截（meta 帶 commit 4b5c79a0f,為前治理期唯一 git 連結部署） |
| dpl_J1W3nrnT6dC9mh5FzVjUuCVppos7 | 2026-10-25 11:59:48 | BLOCKED | 同上（commit 4b5c79a0f） |
| dpl_4U1hH98P6L2Xn42W1uN54bKa9SbC | 2026-10-26 23:35:54 | ERROR | 前治理期建置失敗 |
| dpl_Aghz1RdUxmCoXHWMzZcSGpitRYjp | 2026-10-27 22:48:46 | ERROR | 同上 |
| dpl_5agqhp45BWj4R6BgmCFto93X4geu | 2026-10-27 22:49:09 | ERROR | 同上 |
| dpl_Fgy2vE7PYRCHDbxEZv3jpoWXE1p7 | 2026-10-29 18:14:44 | ERROR | 同上 |
| dpl_6ENSEiuMTNDaV8Bw8vn1GX1tvGW6 | 2026-10-30 05:02:14 | ERROR | 同上 |
| dpl_ARPcWf2QarFFEY7kA9QA7SkMBk6s | 2026-11-01 12:33:11 | ERROR | meta 帶 commit f5171430d |
| dpl_GjgE89RrTkVWYRtWJmPeQCwkw1S9 | 2026-11-08 18:07:02 | ERROR | meta 帶 commit 97c5d6353 |
| dpl_HV2ZiWrtywX5P5Zn3BVMXzuDRw1P | 2026-11-08 18:07:44 | ERROR | 同上 |

- 前治理期與現行驗證無關（內容早被 v5.3.3 以後全部取代）,僅為對帳完整性而登記。

## 4. 對帳方法（MANUS 可重放）

```bash
# (1) Vercel 側全量（需唯讀 token）
VERCEL_TOKEN=*** python3 scripts/vercel_reconcile.py orbit-tower-site
# (1b) 部署鏈重建+內容核實（DEF-003,P2-R5）:存證=governance/deploy-replay-2026-11-15.txt
VERCEL_TOKEN=*** python3 scripts/deploy_chain_audit.py > governance/deploy-replay-2026-11-15.txt
# (2) 比對本檔 §2 與 Release 鏡像（無需 Vercel 權限）
curl -s https://api.github.com/repos/leekc790421-max/orbit-tower-site/releases/tags/v5.3.9 | jq -r .body
# (3) Production 現況（無需任何權限）
curl -s https://tower.xingdeng.tw/VERSION          # 應為現行 tag 版本
# (4) tag→commit 對應
bash scripts/verify_tags.sh
```

驗收等式：**Release vN 登記 = 本檔 §2 vN 鏈 = deploy-log vN 段 = Vercel Deploy History 對應筆**；現行部署 = 最新 READY = tag vN = /VERSION。

## 5. 變更紀錄

| 版本 | 日期 | 變更 |
|---|---|---|
| v1.2 | 2026-11-15 | P2-R5（Manus P2-R4 複查修繕方案①②）:§1 重算 166→169（v5.3.8 鏈 2 筆+v5.3.9 本鏈 1 筆,驗收以當時重放核對）、§2 v5.3.8 鏈 R1/R2 逐筆實登記（含內容核實結果與「未能追溯」誠實標記）、新增 v5.3.9 鏈列、§4 增 deploy_chain_audit.py 工具 |
| v1.1 | 2026-11-15 | P2-R4（MANUS-REVIEW-009 FAIL 修復）:v5.3.7 鏈 R1/R2 逐筆實登記（消除「本 commit」自參照語病）、§1 總計 164→166（含 v5.3.7 鏈 2 筆）、新增 v5.3.8 鏈列、「現行筆登記機制」正式化（歷史輪逐筆實登記,僅現行施工版最後一筆見同名 Release） |
| v1.0 | 2026-11-15 | 依 COPILOT-EXEC-008 建立（P2-R3 DEF-003）:治理期 17 筆逐筆+前治理期 147 筆彙總 |
