# Contributor instructions

- Author application code in TypeScript, with strict checking. Do not add plain
  JavaScript source files. JavaScript compiled by TypeScript is build output.
- Read `docs/ART_STYLE.md`, `docs/ANIMATION_STYLE.md`, and `docs/CODE_STYLE.md`
  before changing rigs, animation, or tooling.
- Use SVG primitives and explicit poses for this experiment. No image-generation
  services, downloaded art, or new runtime dependencies unless requested.
- Treat `src/art.ts` as the artwork source. Regenerate with `npm run build`;
  do not edit `generated/` or the root `preview.html` manually.
- Keep the preview offline, self-contained, keyboard-operable, and free of requests
  to external services. Exported sprites must have transparent backgrounds.
- Preserve fixed cell sizes, anchor coordinates, timing metadata, and per-frame
  mirroring. Visual cues never define gameplay collision or timing rules.
- Run `npm run verify` after changes. Review the preview for silhouettes, clipping,
  foot placement, and motion; report any visual checks you could not perform.
- Commit source, docs, lockfile, and generated SVG/JSON/HTML output together. Do
  not commit node_modules, compiler output, local raster exports, or API keys.
- Keep this repository independent of the sibling `feedback` repository. Do not
  change or commit files in sibling folders as part of this pipeline's work.
