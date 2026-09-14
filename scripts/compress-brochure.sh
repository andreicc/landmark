#!/usr/bin/env bash
# Compress the sales brochure for the web -> public/brochure/landmark-4-brochure.pdf
#
# Usage: scripts/compress-brochure.sh "<source.pdf>" [out.pdf] [dpi]
# Requires ghostscript (brew install ghostscript).
#
# The deck is 67 slides at 1920x1080 *points*, so page width in points equals
# the design's pixel width and DPI maps straight to pixels across the slide:
#
#   dpi  px across  size   notes
#    72     1920    10.8MB shipped default. Crisp at fit-to-screen; photo
#                          slides soften if you zoom past 100%.
#   110     2933    15.1MB near-indistinguishable from source at any zoom.
#   none     —      19.3MB the original.
#
# Floor-plan slides are line art and survive 72dpi almost exactly (mean pixel
# diff 1.0/255); it is only the photographic renders that lose crispness
# (10.3/255). Re-run with 110 if a buyer ever complains about zoomed renders.
#
# Two approaches that did NOT work, so nobody repeats them:
#   pdftocairo -pdf          inflates to 235MB (decompresses the JPEG 2000 streams)
#   qpdf --optimize-images   text stays byte-identical but it cannot resample: 18.5MB
#   -dJPEGQ / QFactor        ignored, or larger than ghostscript's own auto filter
#
# Caveat: the source uses Type 3 fonts with custom encodings (a design-tool
# export). Ghostscript regenerates them and a few ToUnicode mappings don't
# survive, so copy/paste and in-PDF search lose the odd word. Rendering is
# unaffected. If a perfect text layer ever matters more than file size, ship
# `qpdf --optimize-images` output instead and accept ~18.5MB.
set -euo pipefail

SRC=${1:?usage: compress-brochure.sh "<source.pdf>" [out.pdf]}
OUT=${2:-public/brochure/landmark-4-brochure.pdf}
DPI=${3:-72}
mkdir -p "$(dirname "$OUT")"

gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.7 -dNOPAUSE -dQUIET -dBATCH \
   -dColorConversionStrategy=/LeaveColorUnchanged -dDetectDuplicateImages=true \
   -dDownsampleColorImages=true -dColorImageDownsampleType=/Bicubic \
   -dColorImageResolution="$DPI" -dColorImageDownsampleThreshold=1.0 \
   -dDownsampleGrayImages=true -dGrayImageDownsampleType=/Bicubic \
   -dGrayImageResolution="$DPI" -dGrayImageDownsampleThreshold=1.0 \
   -sOutputFile="$OUT" "$SRC"

printf '%s -> %s  (%s at %sdpi)\n' "$SRC" "$OUT" "$(du -h "$OUT" | cut -f1)" "$DPI"
