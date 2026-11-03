# TypeScript and pipeline style

- Strict TypeScript for generator, browser code, and checks. Use explicit union
  types for asset/action identifiers and interfaces for data contracts. Avoid `any`.
- Node code uses ESM and Node built-ins. Browser code uses DOM/Canvas APIs. Keep
  authored code in `src/`; generated JavaScript belongs in ignored `dist/`.
- Two-space indentation, single-quoted TypeScript strings, semicolons, LF newlines.
  Use template strings for SVG geometry. Keep art-related constants named.
- Rig drawing is pure: the same clip/frame always produces the same SVG. No
  randomness, clock reads, network calls, or filesystem access in artwork functions.
- Generation resolves paths relative to its own file, not the caller's directory.
  Write only within this repository. Do not recursively delete output as a shortcut.
- Keep generated output stable: no timestamps, machine paths, locale-sensitive
  formatting, or platform-dependent newlines.
- Keep type assertions at trusted data/DOM boundaries. A non-null assertion needs
  a clear invariant (for example, loop index within an array's length).
- Surface load/export errors in the preview. Validate frame-size input before
  allocating canvases. Revoke object URLs after downloads.
- Tests should protect sheet slicing, timings, anchors, and source/output consistency.
  Avoid asserting snapshots of every drawing detail or duplicating pose equations.
- Before committing, run `npm run verify`, inspect generated changes, and perform
  the visual/export smoke check described in the animation guide when possible.

## Request template for future LLM edits

> Add [asset/clip] using the existing TypeScript rig and palette. Keep 96 × 96 cells,
> stable anchors, transparent SVGs, and explicit frame durations. Follow the art and
> animation guides. Update provenance if using new references, regenerate assets,
> and run verification. Keep gameplay timing out of visual metadata.
