# Art style

## Direction

Readable, compact fantasy machinery: a steel-armored player with a muted violet
cape; a moss-covered ranged sentinel; pale violet parry energy; warm coral hostile
projectiles. Prioritize a clear silhouette at 48–96 screen pixels. The sword should
remain visible in resting and active poses. Both characters face right by default.

## Construction

- Work in a 96 × 96 viewBox, leaving at least four logical units around visible art.
- Use the named colors in `PALETTE` in `src/art.ts`. Add a named color only when a
  new semantic role needs it. Keep values consistent across all frames.
- Prefer rectangles, polygons, simple paths, and solid strokes. Use dark outlines,
  one main fill, and one highlight per material. Avoid filters, gradients, embedded
  bitmaps, fonts within sprites, and texture noise.
- Round generated numeric coordinates to two decimal places. Keep fine features
  at least two logical units wide when possible.
- Draw back limbs and cape first, then torso/head, then the front arm and weapon.
  Keep VFX separate or clearly confined to the active pose.
- Keep a transparent background. Do not bake floor planes, contact shadows,
  labels, guides, or debug rectangles into exportable sprites.
- Use shared rig functions and pose parameters. Fixing a helmet or palette entry
  should update every clip without manually editing every frame.

## Resolution

This is geometric vector art with a blocky aesthetic, not strict pixel art.
Antialiased diagonals are acceptable. Rasterize the SVG at the final size; never
resize an already small raster as the primary export process. Check a small-size
preview to catch eyes, highlights, or weapons that disappear.

## Review

Check transparent, dark, and light backgrounds. Inspect the most extended poses
for clipped swords and effects. Compare frames side by side for accidental scale
changes, drifting heads, inconsistent armor, or changing weapon length.
