# Intro video studio

Builds `marketing/paint-saathi-intro.mp4`: a 100-second vertical (1080x1920) walkthrough of Paint Man on a phone, with an Indian-English voiceover. Everything runs locally in headless Chrome; nothing is uploaded.

1. **Copy and narration:** edit `script.json` (eyebrow, title, italic accent, caption, and `say` for the voiceover), then make the audio with macOS `say`:
   ```bash
   cd marketing/intro-video && mkdir -p audio && python3 -c "import json,subprocess; [subprocess.run(['say','-v','Rishi','-r','168','-o',f'audio/{s[\"id\"]}.wav','--data-format=LEI16@24000',s['say']],check=True) for s in json.load(open('script.json'))]"
   ```
2. **Phone screens:** build the site, run it on port 3002 (`npx next start -p 3002`), then `node capture.mjs` (writes `shots/*.png`; `ONLY=book,visualizer node capture.mjs` redoes a few).
3. **Video:** `python3 server.py 8791` in this folder, then `node export.mjs`. The result is `out/paint-saathi-intro.mp4` (H.264 + AAC, fast-start MP4); copy it to `marketing/`.

Scene timing follows the narration length (`LEAD`, `TAIL` in `compose.html`). Facts in the copy must match the site (`src/config/site.ts`): no prices, ratings or job counts.
