# Emote stickers — deriving `<key>.svg` from `_base.svg`

1. `cp _base.svg <key>.svg`. Change ONLY the contents of `<g id="eyes">`, `<g id="brows">`, `<g id="mouth">`, `<g id="props">`.
   Replace a whole group with balanced tags: `mouth` (and `head`) contain a nested `<g clip-path>`, so a regex that stops at the first `</g>` breaks the XML.
   `glow`, `body`, `ghutra-back`, `head`, `ghutra-front`, `agal` and everything in `<defs>` stay byte-identical (character consistency).
   Exception: a prop that must sit BEHIND the head (trophy, falcon, camel, sun) goes in its own `<g id="props-back">` inserted right after `</g>` of `glow`.
2. Render + look: `node tools/render-emotes-svg.cjs <key>` → `art/emotes/render/<key>.png` (600) and `<key>-64.png` (64, real in-game size). Open both with Read; iterate until the emotion is unmistakable at 64px. Exit code 2 = invalid XML / forbidden content (fix it).
3. Rules: viewBox `0 0 512 512`, transparent background, keep everything inside x,y ∈ [41, 471]. No `<text>`, `<image>`, `<script>`, `<animate>`, CSS animation, external refs. Only filter = the existing glow blur. All ids must stay unique; root has `fill-rule="evenodd"` (a second subpath punches a hole) and round joins/caps.

## Geometry you build on (all in viewBox units, face is symmetric about x=256)
- Face oval: x 158–354, y 94–310 (`#faceP`, also a clipPath `clipFace`). Forehead hem of the ghutra crosses at y≈122 (centre) to 144 (temples); brows/hands drawn above it get hidden under the cloth, which looks natural.
- Eyes: sclera ellipses centre (218,202) and (294,202), rx 27 ry 31, stroke 4.5. Iris r 18 `#4A2C12` at (220,206)/(292,206), pupil r 9.5 `#0E0A08`, two white highlights r 6 at (−7,−9) and r 2.8 at (+8,+8) from the iris centre; heavy upper lid arc stroke 6.5. Closed/squinting eyes = thick 6.5 curves (happy ∪ / sleepy ∩), keep a 4px gap to the brows.
- Brows: filled tapered shapes `#15110F` (stroke `#1A1230` 3), thick end ≈14px, resting zone y 142–185, inner ends at x≈246 / 266 (never let them touch → unibrow). They carry the emotion: raise, tilt, knit, one-up-one-down.
- Nose (part of `head`, fixed): y 224–258 around x 248–267. Mouth zone: x 200–312, y 258–292; the beard band starts at y≈292 at the chin, so a big open laugh may dip to y 300 max. Cheeks (blush) are fixed in `head`.
- Mouth recipe: `<use href="#mouthP">` is the neutral smile. For a new shape draw your own path: fill `#5E1F1F`, outline 5, teeth = white rect clipped by the mouth path, tongue = ellipse `#D9564F` clipped. Closed smile/frown = a single 6px `#1A1230` stroke; "O" = ellipse.
- Props zone: `props` is painted last (over hands can cover the collar/drapes). Hands: skin `url(#skinG)` or `#E3A97C`, outline 8, dishdasha cuff white `#FBF8F2` with a `#DDD6C8` shade. Typical anchors: raised hand x 330–450 / y 220–400, hand on chin around (330,290), cup/phone in the hand at chest right. Floating icons (hearts, Zzz, sparks, sweat drops, steam) go in the upper corners x 44–140 or 372–468, y 48–190 — never over the eyes unless that IS the emote (facepalm).
- Neck x 224–288, collar U y 320–376, gold button (256,384). Shoulders y 338–462, x 62–450.

## Palette
- Outline `#1A1230` — 8 on silhouettes (face, cloth, hands), 7 ears, 5 mouth, 4–5 inner details (nose, folds, pupils' lids 6.5). Join/cap round.
- Skin `#E3A97C` (gradient `url(#skinG)`), shade `#C9885B`, highlight `#F3C9A6`. Beard `#3A2A22`. Blush `#E86A55` (`url(#blushG)`).
- Ghutra/dishdasha white `#FBF8F2`, shade `#E4DDD0`, deeper shade `#D2CABA`/`#DDD6C8`, red squares `#C8352E` (`url(#chk)` pattern, 11px squares). Agal `#15110F`, cord highlight `#4A403A`.
- Gold `#E8B23A`, gold highlight `#FFE9A8`, gold shade `#B07E1E`. Navy (background of the game, never painted) `#0B1530`. Iris `#4A2C12`, mouth inside `#5E1F1F`, tongue `#D9564F`.
- Cel-shading rule: each new form = base tone + one darker shade shape on the lower/right side + one small specular. Gradients only for skin and cheeks; everything else flat.

## Style checklist before you finish an emote
Emotion readable from brows+mouth alone at 64px · silhouette unchanged (ghutra+agal) · no outline gaps · props not colliding with the face · file < 20 KB · `node tools/render-emotes-svg.cjs <key>` prints ✓.
