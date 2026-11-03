import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANCHOR, CELL, CLIPS, PALETTE, frameBody, svg } from './art.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checking = process.argv.includes('--check');
if (process.argv.slice(2).some((arg) => arg !== '--check')) throw new Error('Usage: node dist/generate.js [--check]');

async function output(path: string, contents: string): Promise<void> {
  const target = resolve(root, path);
  if (checking) {
    if (await readFile(target, 'utf8') !== contents) throw new Error(`Generated file differs: ${path}`);
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
}

const clips = [];
for (const clip of CLIPS) {
  const id = `${clip.asset}-${clip.action}`;
  const frames = [];
  const bodies = clip.durations.map((_, i) => frameBody(clip, i));
  for (const [index, body] of bodies.entries()) {
    const file = `generated/frames/${id}/${String(index).padStart(2, '0')}.svg`;
    await output(file, svg(body));
    frames.push({ index, x: index * CELL, y: 0, width: CELL, height: CELL,
      durationMs: clip.durations[index]!, file });
  }
  const sheet = svg(bodies.map((body, i) => `<g transform="translate(${i * CELL} 0)">${body}</g>`).join(''), CELL * bodies.length);
  const sheetFile = `generated/sheets/${id}.svg`;
  await output(sheetFile, sheet);
  clips.push({ id, asset: clip.asset, action: clip.action, loop: clip.loop,
    anchor: clip.asset === 'projectile' || clip.asset === 'parry-fx' ? { x: 48, y: 48 } : ANCHOR,
    facing: 'right', sheet: sheetFile, sheetWidth: CELL * bodies.length, sheetHeight: CELL,
    visualCue: clip.visualCue ?? null, frames, svg: sheet });
}
const catalog = { schemaVersion: 1, logicalFrameSize: CELL, palette: PALETTE, clips };
const contactWidth = CELL * 8 + 32;
const contactHeight = clips.length * 124 + 16;
await output('generated/contact-sheet.svg', svg(
  `<rect width="${contactWidth}" height="${contactHeight}" fill="#151c22"/>`
  + clips.map((clip, row) => `<g transform="translate(16 ${row * 124 + 16})">`
    + `<text x="0" y="12" font-family="monospace" font-size="12" fill="#c3a1ff">${clip.id}</text>`
    + clip.frames.map((frame) => `<g transform="translate(${frame.index * CELL} 20)">`
      + `<rect width="96" height="96" fill="#26313b" stroke="#394655"/>`
      + frameBody(CLIPS[row]!, frame.index) + '</g>').join('') + '</g>').join(''), contactWidth, contactHeight));
// Keep manifest engine-neutral; the embedded SVG strings are only for offline preview/export.
await output('generated/manifest.json', JSON.stringify({ ...catalog,
  clips: clips.map(({ svg: _svg, ...clip }) => clip) }, null, 2) + '\n');
await output('generated/palette.svg', svg(Object.entries(PALETTE).map(([name, color], i) =>
  `<g><rect x="${i * 80}" width="80" height="56" fill="${color}"/><text x="${i * 80 + 4}" y="72" font-size="10" fill="#202733">${name}</text></g>`).join(''), Object.keys(PALETTE).length * 80, 80));
const template = await readFile(resolve(root, 'src/preview.html'), 'utf8');
const script = await readFile(resolve(root, 'dist/preview.js'), 'utf8');
await output('preview.html', template.replace('/* CATALOG_DATA */', JSON.stringify(catalog).replaceAll('<', '\\u003c'))
  .replace('/* PREVIEW_SCRIPT */', () => script));
console.log(`${checking ? 'Verified' : 'Generated'} ${clips.length} clips, ${clips.reduce((n, c) => n + c.frames.length, 0)} frames, manifest, palette and offline preview.`);
