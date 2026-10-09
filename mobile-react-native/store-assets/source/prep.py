"""Prepares raw captures for framing: pulls the status bar clear of the corners.

The emulator draws the clock and system icons hard against the screen edges,
where a real Pixel's rounded corners would never put them; framed in rounded
glass they get clipped. Each side of the status bar is moved inward and the
gap filled with the bar's own colour.

    python3 prep.py raw out/prep
"""
import os
import sys

from PIL import Image

BAR_H = 66          # status bar content height in capture pixels (Pixel 8 Pro, 3x)
INSET = 40          # how far each side moves in
LEFT_W, RIGHT_W = 200, 260   # clock spans x 27-95, icons x 1130-1259


def prepare(src, dst):
    im = Image.open(src).convert("RGB")
    w = im.width
    fill = im.getpixel((w // 2 + 120, BAR_H // 2))
    bar = im.crop((0, 0, w, BAR_H))
    left = bar.crop((0, 0, LEFT_W, BAR_H))
    right = bar.crop((w - RIGHT_W, 0, w, BAR_H))
    clean = Image.new("RGB", (w, BAR_H), fill)
    clean.paste(left, (INSET, 0))
    clean.paste(right, (w - RIGHT_W - INSET, 0))
    im.paste(clean, (0, 0))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst)


if __name__ == "__main__":
    raw, out = sys.argv[1], sys.argv[2]
    for lang in sorted(os.listdir(raw)):
        for name in sorted(os.listdir(os.path.join(raw, lang))):
            if name.endswith(".png"):
                prepare(os.path.join(raw, lang, name), os.path.join(out, lang, name))
