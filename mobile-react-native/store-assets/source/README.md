# Store graphics source

The phone screenshots and feature graphics in `../screenshots/` and `../` are
rendered from the HTML templates here, so a caption or layout change is an
edit and a re-render, not a redesign.

| File | What it is |
| --- | --- |
| `slides.js` | The eight slides: which capture, the caption in each language, the callouts |
| `screenshot.html` | 1080×1920 slide template: brand gradient, caption, Pixel-style frame |
| `feature-graphic.html` | 1024×500 feature graphic, `?lang=en` or `?lang=tr` |
| `prep.py` | Moves the status bar clear of the frame's rounded corners |
| `render.sh` | Renders everything with headless Chromium, flattened to 24-bit PNG |
| `make-gif.sh` | Builds `../demo.gif`, the loop in the root README, from the same captures |
| `fonts/` | Plus Jakarta Sans (SIL Open Font License), loaded locally |
| `raw/{en,tr}/` | The emulator captures (git-ignored, ~13 MB; keep them to re-render) |

```bash
./render.sh             # every slide in both languages, and both feature graphics
./render.sh tr 6        # one slide
```

```bash
./make-gif.sh           # the demo loop, English
./make-gif.sh tr        # the Turkish captures
```

The GIF shows the app's own screens, without the slide captions, so it stays
readable at the 300 px a README column gives it. `WIDTH`, `DELAY` and `COLORS`
override the defaults.

## How the captures were made

- Pixel 8 Pro emulator (API 33, Google Play image), 1344×2992, status bar in
  demo mode: clock 9:41, full battery and signal, no notification icons.
- A release build pointed at a local backend with a throwaway database of
  demo travellers and routes, so nothing shown is production data and nothing
  was written to production.
- English captures with the app in English and English route titles; Turkish
  captures with the app's per-app locale set to `tr-TR` and the same demo
  routes renamed in Turkish, so Google Maps labels and place names match.

Callout rectangles in `slides.js` are in capture pixels. If a screen is
recaptured, check that the rectangles still land on the same content.
