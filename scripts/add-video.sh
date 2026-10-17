#!/usr/bin/env bash
# Encode a product clip for the shop card + poster frame (same settings as cozys.market).
# Usage: scripts/add-video.sh <input-video> <slug>
#   -> public/media/<slug>.mp4 and public/media/<slug>-poster.jpg
# Then set on the product in src/pages/index.astro:
#   video: '/media/<slug>.mp4', video_poster: '/media/<slug>-poster.jpg',
set -euo pipefail
if [ $# -ne 2 ]; then echo "usage: $0 <input-video> <slug>" >&2; exit 1; fi
IN="$1"; SLUG="$2"
[ -f "$IN" ] || { echo "input not found: $IN" >&2; exit 1; }
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "slug must be lowercase letters, digits, dashes" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not installed" >&2; exit 1; }
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/media"
mkdir -p "$DIR"
OUT="$DIR/$SLUG.mp4"; POSTER="$DIR/$SLUG-poster.jpg"
ffmpeg -y -loglevel error -i "$IN" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
  -vf "scale='min(720,iw)':-2" -r 30 -an -movflags +faststart "$OUT"
ffmpeg -y -loglevel error -ss 1 -i "$OUT" -frames:v 1 -q:v 3 "$POSTER"
ls -lh "$OUT" "$POSTER"
echo "Add to the product:  video: '/media/$SLUG.mp4', video_poster: '/media/$SLUG-poster.jpg',"
