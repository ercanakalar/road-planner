#!/usr/bin/env bash
# Builds the demo loop in the root README from the same captures the store
# screenshots use — the app's own screens, no slide chrome or captions.
#
#   ./make-gif.sh              # en, the default eight screens
#   ./make-gif.sh tr           # the Turkish captures
#
# Needs ImageMagick and the raw captures in raw/<lang>/ (see README.md).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
STORE="$(dirname "${HERE}")"
LANG_CODE="${1:-en}"
WIDTH="${WIDTH:-300}"      # phone-sized in a README column
DELAY="${DELAY:-180}"      # centiseconds per screen
COLORS="${COLORS:-192}"    # 256 dithers the maps no better and costs 60 KB
OUT="${STORE}/demo.gif"

# The store's narrative order: plan a route, read it, follow it, then the
# social half — discover, publish, get notified, keep favourites.
SCREENS=(01-plan 02-compare 03-along-map 04-follow 05-discover 06-community 07-notifications 08-favourites)

python3 "${HERE}/prep.py" "${HERE}/raw" "${HERE}/out/prep"

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK}"' EXIT

i=0
for screen in "${SCREENS[@]}"; do
  src="${HERE}/out/prep/${LANG_CODE}/${screen}.png"
  [ -f "${src}" ] || { echo "missing capture: ${src}" >&2; exit 1; }
  i=$((i + 1))
  convert "${src}" -resize "${WIDTH}x" -strip "${WORK}/$(printf '%02d' "${i}").png"
done

convert -delay "${DELAY}" -loop 0 "${WORK}"/[0-9][0-9].png \
  -layers OptimizeTransparency -colors "${COLORS}" "${OUT}"

echo "${OUT#"$(dirname "${STORE}")"/} — $(du -h "${OUT}" | cut -f1), ${i} screens"
