# Feedback SVG sprite pipeline

LLM-authored vector placeholders for Feedback, a university 2D platformer project.
TypeScript describes small reusable rigs and poses; a deterministic generator writes
standalone SVG frames, horizontal sheets, timing metadata, and an offline preview.
No image-generation service, API keys, or runtime packages are needed.

## Try it

Open **[preview.html](preview.html)** directly in a modern browser. The committed
preview contains its artwork and code and works without a server or an installation.
Choose a clip, scrub individual frames, and switch the facing direction. One-shot
clips stop on their final frame; use Replay to run them again.

Choose a PNG frame size (16–1024 pixels) and download a transparent PNG sheet and
its matching JSON. Keep the same size and facing selections for both downloads.
SVGs are rasterized directly at the selected size, rather than enlarging a small PNG.
Guides and checkerboards are preview-only and never enter exported images.

## Use in Godot 4

For a quick trial, import `generated/project.godot` in Godot and run it (F5).
The demo loads all 11 animations from native resources backed by the SVG sheets;
no PNG export or JSON importer is required. One-shot clips play once on startup.

To use a raster export in your own project:

1. In the browser preview, choose a clip, frame size, and facing direction.
2. Download the **PNG sheet** and **Godot .tres** using the same settings.
3. Copy both into the same folder inside your Godot project. Keep their filenames.
4. Assign the `.tres` to an `AnimatedSprite2D` node's **Sprite Frames** property.
   It already contains the animation name, frame regions, durations, and loop flag.
5. Optionally download **Godot scene** with the same settings and place it beside
   the PNG and `.tres`. Instance that `.tscn` to get an `AnimatedSprite2D` with the
   animation, autoplay, and anchor offset already configured.

The `.tres` alone stores the anchor as `metadata/pipeline_anchor`; it cannot apply
a node offset. For a manually created node, disable **Centered** and set **Offset**
to the negative anchor (at 96 px: `(-48, -80)` for characters, `(-48, -48)` for FX).
The optional scene performs this step. Left-facing PNGs are already mirrored;
do not also enable Flip H unless you intend to reverse them again.

Each `.tres` contains one clip. To use several clips on a single character, merge
their animations into one SpriteFrames resource in Godot or switch resources in
your controller. The demo is an art preview and contains no movement or combat code.
Texture references are relative, so keep dependent files together when copying.

Godot frame durations are relative to animation FPS. The exporter uses a base
speed of 10 FPS with duration weights `durationMs / 100`, preserving variable timing
at normal playback speed. See [SpriteFrames](https://docs.godotengine.org/en/stable/classes/class_spriteframes.html)
and [AnimatedSprite2D](https://docs.godotengine.org/en/stable/classes/class_animatedsprite2d.html).

## Develop and regenerate

Requires Node.js 22+ and npm. All authored application code is strict TypeScript.

```sh
npm ci
npm run build
npm run verify
```

`build` compiles the generator and browser TypeScript, then regenerates all assets
and the preview. `check` type-checks both environments. `test` builds and checks
frame/sheet/metadata consistency. `node dist/generate.js --check` compares existing
generated files against their source without writing them. Generated files have no
timestamps or random seeds and should reproduce byte for byte.

## Included assets

| Asset | Clips | Frames |
| --- | --- | --- |
| Player | idle, run, jump, parry, hurt | 28 |
| Sentinel | idle, move, shoot, hurt | 22 |
| Projectile | fly | 4 |
| Parry effect | burst | 6 |

`src/art.ts` owns the palette, rigs, pose sampling, clip durations, and logical anchors.
Edit it instead of editing generated SVGs. `src/generate.ts` writes:

- `generated/frames/<asset>-<action>/<frame>.svg`: individual vector frames.
- `generated/sheets/<asset>-<action>.svg`: horizontal vector sheets.
- `generated/manifest.json`: source sheet paths, frame rectangles, durations, anchors, and loop flags.
- `generated/palette.svg`: palette reference.
- `generated/contact-sheet.svg`: labeled overview of every pose (review artifact, not a game sheet).
- `generated/godot/`: SVG-backed Godot 4 resources, anchored sprite scenes, and a demo scene.
- `generated/project.godot`: standalone Godot demo project.
- `preview.html`: self-contained preview/export tool, built from `src/preview.html` and `src/preview.ts`.

Committed generated output makes the experiment immediately reviewable. `dist/`,
`node_modules/`, and optional local `exports/` are ignored. Rebuild and review the
diff when changing source. If removing or renaming clips, remove their obsolete
generated files explicitly; generation deliberately does not delete directories.

## Engine contract

All source cells are **96 × 96 logical units**, facing right. Sheets contain one row,
no padding, no trimming, and no packed rotation. Frame indices start at zero. Each
frame has its own `durationMs`; do not replace variable timing with a single FPS.
Character anchors are `(48, 80)`; projectile/effect anchors are `(48, 48)`, measured
from the frame's top left. Engine origin = frame origin + anchor. When rasterized,
the JSON export scales anchors and rectangles to the chosen pixel size.

Left-facing export mirrors each frame individually and preserves frame order.
Use a transparent canvas and preserve the full cell on import. Godot 4 resources
are included; the generic PNG and JSON remain available for other engines.

Jump poses show anticipation, tucked legs, falling, and landing. Actual world motion
belongs to the engine. Parry/shoot `visualCue` fields mark an illustrative art frame,
**not a hitbox, collision shape, or authoritative gameplay event**. No shadows are
baked into characters, so the engine can place ground shadows independently.

## Art direction and limitations

See [art style](docs/ART_STYLE.md), [animation conventions](docs/ANIMATION_STYLE.md),
and [TypeScript conventions](docs/CODE_STYLE.md). [AGENTS.md](AGENTS.md) gives future
LLM contributors the same workflow. [Provenance](docs/PROVENANCE.md) records the
relationship to the existing project artwork.

These are blocky vector placeholders, not a finished hand-pixelled asset pack.
Slanted strokes and transforms intentionally produce antialiasing; arbitrary
resolution export does not imply a strict pixel grid. Review at the intended game
size. For a pixel-art production pass, use integer coordinates, a chosen native
resolution, manual cleanup, and nearest-neighbor display where appropriate.
