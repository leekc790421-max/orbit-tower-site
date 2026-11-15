#!/usr/bin/env bash
# SNT tag 不可變登記驗證（DEF-004）——僅用 GitHub 公開 API，無需權限。
# 用法: bash scripts/verify_tags.sh [OWNER/REPO]
REPO="${1:-leekc790421-max/orbit-tower-site}"
fail=0
check() { # tag expected_prefix
  local tag="$1" want="$2"
  local got
  got=$(curl -s "https://api.github.com/repos/$REPO/git/ref/tags/$tag" \
    | grep -o '"sha": *"[0-9a-f]*"' | head -1 | grep -o '[0-9a-f]\{40\}')
  # annotated tag: ref 指向 tag object,需再解一層取 commit
  local obj_type
  obj_type=$(curl -s "https://api.github.com/repos/$REPO/git/ref/tags/$tag" | grep -o '"type": *"[a-z]*"' | head -1 | cut -d'"' -f4)
  if [ "$obj_type" = "tag" ]; then
    got=$(curl -s "https://api.github.com/repos/$REPO/git/tags/$got" | grep -o '"sha": *"[0-9a-f]*"' | sed -n '2p' | grep -o '[0-9a-f]\{40\}')
  fi
  if [ -z "$want" ]; then echo "?  $tag -> ${got:-未取得}"; return; fi
  case "$got" in
    "$want"*) echo "OK  $tag -> $got";;
    *) echo "FAIL $tag -> ${got:-未取得}（登記值 $want）"; fail=1;;
  esac
}
echo "== $REPO tag 登記驗證（對照 governance/tag-protection.md §5）=="
check v5.3.3 cab67f8
check v5.3.4 ca81640
check v5.3.5 2265813
check v5.3.6 ""   # 本版:輸出現值供與登記表人工比對
echo "== /VERSION 實測 =="
curl -s https://tower.xingdeng.tw/VERSION && echo
exit $fail
