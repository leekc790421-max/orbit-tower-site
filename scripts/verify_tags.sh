#!/usr/bin/env bash
# SNT Tag 三驗（DEF-004 v2, COPILOT-EXEC-008）:對 governance/tag-registry.txt 之每個 tag 驗證——
#   (1) 存在  (2) 不可變(現值==PINNED 期望值,任何偏離 FAIL)  (3) 對應 commit 正確(含 annotated tag peel)
# 主路徑:git ls-remote(公開 repo,無需權限、無 API 限流);備援:GitHub REST API(可設 GH_TOKEN 提高額度)。
# CURRENT 列=現行施工版:自參照不可預先釘死,交付時登記於同名 GitHub Release(部署登記表),
#   若設 EXPECT_v5_3_7=<sha> 環境變數則一併硬驗;否則輸出現值供與 Release 比對。
# 用法: bash scripts/verify_tags.sh [OWNER/REPO]
REPO="${1:-leekc790421-max/orbit-tower-site}"
URL="https://github.com/$REPO.git"
fail=0; npin=0; ncur=0

peeled() { # annotated tag 取 ^{} peel 後 commit;lightweight 直接取 ref sha
  local out commit
  out=$(git ls-remote "$URL" "refs/tags/$tag" "refs/tags/$tag^{}" 2>/dev/null)
  commit=$(echo "$out" | awk '$2 ~ /\^\{\}$/ {print $1}' | head -1)
  [ -z "$commit" ] && commit=$(echo "$out" | awk -v t="refs/tags/$tag" '$2 == t {print $1}' | head -1)
  echo "$commit"
}
api_commit() { # 備援路徑
  local obj sha typ
  obj=$(curl -s ${GH_TOKEN:+-H "Authorization: Bearer $GH_TOKEN"} "https://api.github.com/repos/$REPO/git/ref/tags/$tag")
  sha=$(echo "$obj" | grep -o '"sha": *"[0-9a-f]*"' | head -1 | grep -o '[0-9a-f]\{40\}')
  typ=$(echo "$obj" | grep -o '"type": *"[a-z]*"' | head -1 | cut -d'"' -f4)
  if [ "$typ" = "tag" ]; then
    curl -s ${GH_TOKEN:+-H "Authorization: Bearer $GH_TOKEN"} "https://api.github.com/repos/$REPO/git/tags/$sha" \
      | grep -o '"sha": *"[0-9a-f]*"' | sed -n '2p' | grep -o '[0-9a-f]\{40\}'
  else
    echo "$sha"
  fi
}

REG="${REG_FILE:-governance/tag-registry.txt}"
[ -f "$REG" ] || REG="$(dirname "$0")/../governance/tag-registry.txt"
echo "== SNT tag 三驗(存在/不可變/commit 正確) — repo=$REPO,期望值=$REG =="
while read -r tag want state; do
  case "$tag" in ""|\#*) continue;; esac
  [ "$want" = "CURRENT" ] && state="CURRENT" && want="-"
  got=$(peeled); [ -z "$got" ] && got=$(api_commit)
  if [ -z "$got" ]; then
    echo "FAIL $tag 不存在於遠端(或網路失敗)"; fail=1; continue
  fi
  envname="EXPECT_$(echo "$tag" | tr 'v.' '__')"
  if [ "$state" = "PINNED" ]; then
    npin=$((npin+1))
    if [ "$got" = "$want" ]; then
      echo "OK  $tag 存在且不可變,$got(=登記值)"
    else
      echo "FAIL $tag 現值 $got ≠ PINNED 登記值 $want —— tag 已變動!"; fail=1
    fi
  elif [ "$state" = "CURRENT" ]; then
    ncur=$((ncur+1))
    exp=$(printenv "$envname" 2>/dev/null || true)
    if [ -n "$exp" ]; then
      if [ "$got" = "$exp" ]; then
        echo "OK  $tag 存在且不可變,$got(=$envname)"
      else
        echo "FAIL $tag 現值 $got ≠ $envname $exp"; fail=1
      fi
    else
      echo "?   $tag 為現行施工版,commit=$got(自參照;交付時釘於 GitHub Release $tag 部署登記,次版納入 PINNED)"
    fi
  fi
done < "$REG"
echo "== 統計:PINNED 硬驗 $npin 個,CURRENT 軟驗 $ncur 個 =="
echo "== /VERSION 實測 =="
curl -s https://tower.xingdeng.tw/VERSION && echo
exit $fail
