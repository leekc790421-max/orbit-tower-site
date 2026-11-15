# SNT Deployment Registry（部署登記單一權威來源 / Single Source Of Truth）

> 建立：P2-R3 Defect Fix（COPILOT-EXEC-008 / MANUS-REVIEW-008 判定 DEF-003：Release Registry 與 Vercel Deploy History 不一致）
> 狀態：v1.0（2026-11-15）
> 權威序：**本檔 = SSOT**；同名 GitHub Release = 公開唯讀鏡像（無 Vercel 權限者之驗證入口）；deploy-log = 敘事與政策檔。三者如有出入，以本檔為準，並視為缺陷立即處理。
> 產生方式：`VERCEL_TOKEN=*** python3 scripts/vercel_reconcile.py`（唯讀 API，可重放）。本檔數據取自 2026-11-15 02:0x UTC 實測輸出（production 部署全量 164 筆）。

---

## 1. 部署史總覽（Vercel Deploy History 全量對帳）

| 分期 | 期間 | 筆數 | READY | ERROR | BLOCKED | 登記方式 |
|---|---|---|---|---|---|---|
| 前治理期 | 2026-10-16 ~ 2026-11-08 | 147 | 136 | 9 | 2 | §3 彙總登記（無 tag/git 對應,異常筆逐筆列 ID） |
| 治理期（v5.3.3 起） | 2026-11-13 ~ 現在 | 17（至 v5.3.6 交付） | 16 | 1 | 0 | §2 逐筆登記 |
| 合計 | — | **164** | 152 | 10 | 2 | — |

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

### v5.3.7 鏈（P2-R3,COPILOT-EXEC-008）

| # | Deploy ID | Timestamp (UTC) | State | Commit | Release | Production State |
|---|---|---|---|---|---|---|
| 部署鏈 | 交付時補記 | — | — | （本 commit）= tag v5.3.7 | v5.3.7 | 見 Release v5.3.7 部署登記 |

> **一行落差規則**：Deploy ID 於部署完成後始由 Vercel 產生,「載送本檔之部署」無法在部署前自載其 ID。故每鏈僅最後一筆（現行）之 ID 登記於同名 Release（交付後即時補記,不需重新部署）,其餘歷史筆全部逐筆在本檔與 Release 呈現。此為結構性落差,非紀錄不實。

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
# (2) 比對本檔 §2 與 Release 鏡像（無需 Vercel 權限）
curl -s https://api.github.com/repos/leekc790421-max/orbit-tower-site/releases/tags/v5.3.6 | jq -r .body
# (3) Production 現況（無需任何權限）
curl -s https://tower.xingdeng.tw/VERSION          # 應為現行 tag 版本
# (4) tag→commit 對應
bash scripts/verify_tags.sh
```

驗收等式：**Release vN 登記 = 本檔 §2 vN 鏈 = deploy-log vN 段 = Vercel Deploy History 對應筆**；現行部署 = 最新 READY = tag vN = /VERSION。
