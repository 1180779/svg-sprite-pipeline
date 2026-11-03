# Animation and sheet conventions

## Frame geometry

Every cell is 96 × 96, including empty space. Character ground anchors are `(48,80)`;
projectile and effect centers are `(48,48)`. Anchors represent the stable game origin,
not the current center of the drawing. Tucked jump feet can move above the origin.
Do not trim frames, move their origins, or center each pose independently.

Sheets are horizontal strips in chronological order: frame `i` occupies
`(i * 96, 0, 96, 96)`. No padding or rotation. Each SVG frame is standalone and
contains no CSS/SMIL animation, script, external reference, or shared external defs.
PNG exports use the same convention at the selected frame size. Mirroring happens
inside each cell; never reverse the complete strip.

## Motion

- Idle: subtle head/body motion, stable feet, no distracting large sway.
- Run/move: opposite leg phases with a visible lift during recovery. Animate in
  place; the engine supplies translation. These placeholders use a simple gait;
  final foot-contact timing must be tuned to actual game speed.
- Jump: anticipation → tuck → airborne hold → descent → landing. One shot, with
  world displacement and airborne duration controlled by the game.
- Parry: preparation → raise guard → clear contact flash → held guard → recovery.
  Keep the character readable behind the flash. One shot.
- Shoot: charge → muzzle flash/recoil → recovery. Projectile travel is separate.
- Hurt: short recoil and recovery, without strobing opacity.
- FX: center them on their own anchor so an engine can attach them to an impact.

## Timing

Durations are explicit positive milliseconds, not inferred from sheet dimensions.
Loop samples omit a duplicate endpoint: phase `i / frameCount`, not
`i / (frameCount - 1)`. One-shot poses use explicit endpoint data and return to a
readable rest. Metadata uses zero-based frame indices; UI labels use one-based ones.

`visualCue` is an optional annotation for an artist/reviewer. Never treat it as the
source of parry windows, attack activation, collision, or projectile spawning logic.
Engine animation states may pause, interrupt, or stretch these example clips.

## Acceptance

Preview at original and small display sizes. Scrub anticipation/contact/recovery
frames. Check no part enters a neighboring cell. Check looping at the last/first
boundary. Export both facings and verify that frame order and anchors survive.
