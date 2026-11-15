#!/usr/bin/env bash
# SNT tag 不可變登記驗證（DEF-004）——主要路徑 git ls-remote（公開 repo,無需認證、無 API 限流）;
# 備援路徑 GitHub REST API(可能受未認證 60/hr 限流,可設 GH_TOKEN 提高額度)。
# 用法: bash scripts/verify_tags.sh [OWNER/REPO]
REPO="${1:-leekc790421-max/orbit-tower-site}"
URL="https://github.com/$REPO.git"
fail=0

peeled() { # tag -> commit sha(annotated 取 ^{} peel;lightweight 直接取 ref sha)
  local out commit
  out=$(git ls-remote "$URL" "refs/tags/$tag" "refs/tags/$tag^{}" 2>/dev/null)
  commit=$(echo "$out" | awk '$2 ~ /\^\{\}$/ {print $1}' | head -1)
  [ -z "$commit" ] && commit=$(echo "$out" | awk -v t="refs/tags/$tag" '$2 == t {print $1}' | head -1)
  echo "$commit"
}

check() { # tag expected_commit_prefix
  tag="$1"; want="$2"
  got=$(peeled)
  if [ -z "$got" ]; then
    # 備援:REST API(annotated tag 需再解一層)
    obj=$(curl -s ${GH_TOKEN:+-H "Authorization: Bearer $GH_TOKEN"} "https://api.github.com/repos/$REPO/git/ref/tags/$tag")
    sha=$(echo "$obj" | grep -o '"sha": *"[0-9a-f]*"' | head -1 | grep -o '[0-9a-f]\{40\}')
    typ=$(echo "$obj" | grep -o '"type": *"[a-z]*"' | head -1 | cut -d'"' -f4)
    if [ "$typ" = "tag" ]; then
      got=$(curl -s ${GH_TOKEN:+-H "Authorization: Bearer $GH_TOKEN"} "https://api.github.com/repos/$REPO/git/tags/$sha" \
        | grep -o '"sha": *"[0-9a-f]*"' | sed -n '2p' | grep -o '[0-9a-f]\{40\}')
    else
      got="$sha"
    fi
  fi
  if [ -z "$want" ]; then echo "?  $tag -> ${got:-未取得}"; return; fi
  case "$got" in
    "$want"*) echo "OK  $tag -> $got";;
    *) echo "FAIL $tag -> ${got:-未取得}（登記值 $want）"; fail=1;;
  esac
}

echo "== $REPO tag 登記驗證（對照 governance/tag-protection.md §5;ls-remote peel 後 commit）=="
check v5.3.3 cab67f8
check v5.3.4 ca81640
check v5.3.5 2265813
check v5.3.6 ""   # 現行版:輸出現值,與 Release v5.3.6 登記比對
echo "== /VERSION 實測 =="
curl -s https://tower.xingdeng.tw/VERSION && echo
exit $fail
