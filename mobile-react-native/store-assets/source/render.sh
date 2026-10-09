#!/usr/bin/env bash
# Renders the store screenshots and feature graphic from the HTML templates.
#
#   ./render.sh                 every slide, every language, every canvas
#   ./render.sh en 3 phone      one slide
#
# Needs Chromium and python3 with Pillow. Raw captures go in raw/<lang>/ as
# 1344x2992 PNGs (Pixel 8 Pro emulator, status bar in demo mode).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
STORE="$(dirname "${HERE}")"
CHROME="${CHROME:-chromium}"
SLIDES="$(grep -c "^    shot: " "${HERE}/slides.js")"

declare -A SIZE=([phone]=1080,1920)
declare -A DEST=([phone]=phone)

shoot() { # url width,height out.png
  local tmp="${HERE}/out/.render.png"
  "${CHROME}" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="$2" \
    --virtual-time-budget=4000 --screenshot="${tmp}" "$1" >/dev/null 2>&1
  # Play wants 24-bit PNGs: no alpha channel.
  python3 - "${tmp}" "$3" <<'PY'
import sys
from PIL import Image
Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], optimize=True)
PY
  rm -f "${tmp}"
  echo "  ${3#${STORE}/}"
}

render_slide() { # lang slide canvas
  local name; name="$(grep "^    out: " "${HERE}/slides.js" | sed -n "${2}p" | sed -E "s/.*'(.*)'.*/\1/")"
  local out="${STORE}/screenshots/${DEST[$3]}/$1"
  mkdir -p "${out}"
  shoot "file://${HERE}/screenshot.html?lang=$1&slide=$2&canvas=$3" "${SIZE[$3]}" "${out}/${name}.png"
}

mkdir -p "${HERE}/out"
python3 "${HERE}/prep.py" "${HERE}/raw" "${HERE}/out/prep"

if [ $# -ge 2 ]; then
  render_slide "$1" "$2" "${3:-phone}"
  exit 0
fi

for canvas in "${!SIZE[@]}"; do
  for lang in en tr; do
    for i in $(seq 1 "${SLIDES}"); do render_slide "${lang}" "${i}" "${canvas}"; done
  done
done

for lang in en tr; do
  shoot "file://${HERE}/feature-graphic.html?lang=${lang}" 1024,500 "${STORE}/feature-graphic-${lang}.png"
done
