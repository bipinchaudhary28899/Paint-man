# Wall visualizer evaluation on hard room photos

Date: 18 October 2026. Browser: Chromium (Claude desktop pane), 1440×1000, Apple Silicon laptop, ONNX
Runtime WebAssembly. Shade used throughout: **Peacock PM-803 (#1f8f85)**, a saturated mid-dark teal
chosen so that any mis-labelled pixel is obvious against white, grey and dark rooms alike.

Photos are the 13 licence-clear Pexels cases in [`tests/fixtures/rooms/manifest.json`](../../tests/fixtures/rooms/manifest.json)
(Pexels licence, free to use), loaded at 1080 px wide via the site's own image proxy, plus one extra
photo (29012619, airy living room with a bright roller blind) that failed during development.
Screenshots: `b0/` (baseline), `b1/` (B1 model on the failures), `tuned/` (final parameters),
`hole-0.02/` (rejected experiment).

## Scoring

- **good** – every wall surface painted, nothing else painted, edges clean enough that no brush work is needed.
- **acceptable** – a corner or strip missed, or a sliver of ceiling/trim caught; one or two brush strokes fix it.
- **partial** – a wall half-painted (large unpainted pockets) or a wall surface missed entirely.
- **fail** – a non-wall surface (cupboard, blind, door) painted as a wall, or a wall so patchy the result is unusable without repainting by hand.

## Baseline (SegFormer-B0, speck filter 0.4 %, feather 2 px × 2, fallback < 3 %)

| # | Case | Pexels | Surfaces | Detect (ms) | Result | Notes |
|---|------|--------|---------:|------------:|--------|-------|
| 1 | White walls + white cupboards | 7535073 | 1 | 3355 | good | cupboards and worktop untouched |
| 2 | White walls + white units | 6636302 | 1 | 1903 | good | |
| 3 | White wardrobe on white wall | 6489100 | 1 | 1847 | good | wardrobe left alone |
| 4 | White wardrobe doors beside bed | 30002781 | 2 | 2497 | **fail** | wardrobe doors taken as wall, with large unpainted pockets |
| 5 | Sofa against wall, TV + art | 7031875 | 1 | 2700–3100 | good | TV and art excluded |
| 6 | Sofa, framed art, shelves | 7587735 | 2 | ~2000 | good | |
| 7 | Bright window, strong sun | 2929293 | 2 | ~2800 | acceptable | a strip beside the window frame missed |
| 8 | Window + door, peeling paint | 7350000 | 2 | 1900–2400 | partial | peeling (orange) patches of the wall not painted |
| 9 | Very dark wall, dark wardrobe | 6903153 (828 px) | 5 | 3222 | **fail** | wall broken into 5 patches; dark wardrobe partly tinted |
| 10 | Dark wall, TV, three frames | 13043955 | 1 | 1761 | good | frames and TV kept |
| 11 | Textured brick wall | 39367039 | 1 | 3824 | acceptable | brick texture kept, mortar lines tinted too (expected) |
| 12 | Mirror on wall | 12715512 | 1 | 3332 | good | mirror not painted |
| 13 | Low resolution (384 px) | 6782370 | 1 | 784 | good | |
| 14 | Airy room, bright roller blind | 29012619 | 2 | ~3000 | **fail** | blind painted as wall |

Median detection time 2.5 s at 1080 px (0.8 s at 384 px). First visit also downloads ≈9 MB (runtime + B0 model).

## Where the failures come from

All three failures are **model label errors**, not mask-cleanup errors: a glossy flat white panel
(wardrobe door, roller blind) looks like a painted wall at 512 px, and a near-black wall next to a
near-black wardrobe is ambiguous. Semantic segmentation returns one label per pixel, so the
`wall` mask already excludes `cabinet`, `wardrobe`, `door`, `windowpane`, `curtain`, `painting`,
`mirror`, `screen` and `television receiver` wherever the model predicted those — subtracting
those classes from the wall mask changes nothing when the model has already called the pixel
`wall`. That option was therefore not pursued.

## B1 on the failures (`?model=b1`, 14.5 MB)

| # | Case | B0 | B1 | Verdict |
|---|------|----|----|---------|
| 4 | White wardrobe doors | 2 surfaces, 2497 ms, patchy | 1 surface, 3274 ms, no pockets | cleaner mask, but **still paints the wardrobe doors** |
| 8 | Window + door, peeling paint | 2 surfaces, ~2.2 s, partial | 1 surface, 2561 ms | same pockets where the paint has peeled |
| 9 | Very dark wall | 5 surfaces, 3222 ms, patchy | 4 surfaces, 1809 ms, wall fully painted, wardrobe untouched | **fixed** |
| 14 | Airy room, bright blind | 2 surfaces | 2 surfaces, 3408 ms | blind still painted |

B1 fixes the dark-wall case and smooths the others but does not change what the model thinks is a
wall. Per the brief the default stays B0; `?model=b1` remains available as an opt-in for the dark-room
case (extra 10 MB download, similar speed once loaded).

## Knob tuning (B0)

Only the four permitted knobs were touched; the model is unchanged.

| Knob | Before | Tried | After | Measured effect |
|------|--------|-------|-------|-----------------|
| Speck filter `dropSmallComponents` | 0.4 % of image | 0.4 % | **0.4 %** | Already removes every stray fleck on furniture in the 14 photos; raising it would start deleting the genuine thin wall strip in case 7. Kept. |
| Pocket fill `fillSmallHoles` (new, the speck filter run on the inverse mask) | – | 0.4 %, 2 % | **0.4 %** | Fills switch-plate-sized pockets. At 2 % the remaining pockets in cases 4 and 9 still did not close (they are open to the ceiling / wardrobe region, not enclosed), and the three frames in case 10 and the art in case 6 survived; the gain was not worth the risk of painting a small picture, so the conservative 0.4 % was kept. Cases 4/9 unchanged at 2 and 5 surfaces respectively. |
| Feather radius | `max(1, round(width/600))` px, 2 passes (2 px at 1080) | – | unchanged | Edges were clean on all 14 at 1080 px; an earlier 4 px test bled teal onto skirting and door trim. |
| Manual-fallback coverage | < 3 % | – | unchanged | No photo fell between 3 % and 10 %; the lowest real wall coverage (case 8) was well above. The fallback never triggered falsely. |
| Recolour lightness compression | > 0.95 → ×0.3, < 0.08 → ×0.4 | – | unchanged | Peacock on the white kitchens read as a mid teal with highlights intact; on the near-black wall of case 9 the paint stayed dark but visibly teal. No clipping seen. |

### After tuning (B0, final parameters)

| # | Case | Surfaces | Detect (ms) | Result | Change |
|---|------|---------:|------------:|--------|--------|
| 4 | White wardrobe doors | 2 | 2445 | fail | small pockets closed; doors still painted |
| 5 | Sofa, TV + art (regression check) | 1 | 2280 | good | unchanged |
| 8 | Window + door, peeling paint | 2 | 1749 | partial | unchanged |
| 9 | Very dark wall | 5 | 2485 | fail (B0) / good (B1) | unchanged on B0 |

Overall on B0: 8 good, 2 acceptable, 1 partial, 3 fail out of 14; the three fails are all
one-tap fixes with the surface toggle (case 4, 14) or the Add brush (case 9), or a `?model=b1`
switch (case 9).

## Chosen parameters

```
model                      Xenova/segformer-b0-finetuned-ade-512-512 (q8, wasm)   — unchanged
SPECK_FRACTION             0.004   (segment.worker.ts)
HOLE_FRACTION              0.004   (segment.worker.ts, new fillSmallHoles pass)
feather                    radius max(1, round(width/600)), 2 passes (Visualizer.tsx)
manual fallback            surfaces === 0 || coverage < 0.03 (Visualizer.tsx)
lightness compression      >0.95 ×0.3, <0.08 ×0.4 (recolour.ts)
```

## What would actually move the failures

Not done here (out of the brief's scope): a larger default model (B1 fixes dark rooms), a
boundary-refinement pass (guided filter on the photo's own edges) for peeling/textured walls,
or a brightness prior that refuses to call a saturated-white panel `wall` when it sits in a
rectangular frame. The UI already covers the gap: tap a surface to exclude it, brush to add.
