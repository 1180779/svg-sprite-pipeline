import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANCHOR, CELL, CLIPS, PALETTE, frameBody, svg } from './art.js';
import { spriteFrames, spriteScene } from './godot.js';

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
for (const clip of clips) {
  await output(`generated/godot/${clip.id}.tres`, spriteFrames(clip, CELL, CELL, `../sheets/${clip.id}.svg`));
  await output(`generated/godot/${clip.id}.tscn`, spriteScene(clip, CELL, CELL, `${clip.id}.tres`));
}
await output('generated/project.godot', `; Generated SVG animation preview project for Godot 4.\nconfig_version=5\n\n[application]\nconfig/name="Feedback SVG placeholders"\nrun/main_scene="res://godot/demo.tscn"\n\n[display]\nwindow/size/viewport_width=1100\nwindow/size/viewport_height=700\n\n[rendering]\nrenderer/rendering_method="gl_compatibility"\nenvironment/defaults/default_clear_color=Color(0.08, 0.11, 0.14, 1)\n`);
await output('generated/godot/demo.tscn', `[gd_scene load_steps=${clips.length + 1} format=3]\n\n`
  + clips.map((clip, index) => `[ext_resource type="PackedScene" path="${clip.id}.tscn" id="${index + 1}"]\n`).join('')
  + '\n[node name="Demo" type="Node2D"]\n'
  + clips.map((clip, index) => {
    const x = 120 + index % 4 * 260;
    const y = 150 + Math.floor(index / 4) * 200;
    return `\n[node name="Sprite${index}" parent="." instance=ExtResource("${index + 1}")]\nposition = Vector2(${x}, ${y})\nscale = Vector2(1.5, 1.5)\n`
      + `\n[node name="Label${index}" type="Label" parent="."]\noffset_left = ${x - 80}.0\noffset_top = ${y + 15}.0\ntext = "${clip.id}"\n`;
  }).join(''));
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
const browserCode = await readFile(resolve(root, 'dist/browser/preview.js'), 'utf8');
const godotCode = await readFile(resolve(root, 'dist/browser/godot.js'), 'utf8');
if (!browserCode.includes("from './godot.js'")) throw new Error('Missing browser exporter import.');
// Inline the shared ES module as a data URL so file:// preview needs no server.
const script = browserCode.replace("from './godot.js'", `from "data:text/javascript;base64,${Buffer.from(godotCode).toString('base64')}"`);
await output('preview.html', template.replace('/* CATALOG_DATA */', JSON.stringify(catalog).replaceAll('<', '\\u003c'))
  .replace('/* PREVIEW_SCRIPT */', () => script));
console.log(`${checking ? 'Verified' : 'Generated'} ${clips.length} clips, ${clips.reduce((n, c) => n + c.frames.length, 0)} frames, manifest, palette and offline preview.`);
