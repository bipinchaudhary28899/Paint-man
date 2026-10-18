# Evaluation rooms for the wall visualizer

`manifest.json` lists the photos used to evaluate `/visualizer` against the hard cases in the brief.
The photos are **not stored in the repo**: each is a Pexels photo (Pexels licence, free to use,
no attribution required) referenced by URL and loaded through the site's own image proxy
(`/_next/image`), exactly as the visualizer's sample rooms are. `width` is the proxy width the case
is evaluated at (384 px for the deliberate low-resolution case, 1080 px otherwise).

Results and screenshots live in `docs/visualizer-eval/`. To reproduce, run the dev server, open
`/visualizer?model=b0` (or `b1`, `b2`) and load each `url` through the file input; the status line
reports surfaces found and detection time.
