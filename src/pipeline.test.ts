import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ANCHOR, CELL, CLIPS, frameBody } from './art.js';
import { godotAnchor, spriteFrames, spriteScene } from './godot.js';

test('each sheet rectangle maps to the same standalone frame and duration', async () => {
  const manifest = JSON.parse(await readFile(new URL('../generated/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.clips.length, CLIPS.length);
  for (const clip of manifest.clips) {
    const sheet = await readFile(new URL(`../${clip.sheet}`, import.meta.url), 'utf8');
    const source = CLIPS.find((item) => `${item.asset}-${item.action}` === clip.id)!;
    assert.equal(clip.sheetWidth, clip.frames.length * CELL);
    assert.equal(clip.sheetHeight, CELL);
    for (const frame of clip.frames) {
      const standalone = await readFile(new URL(`../${frame.file}`, import.meta.url), 'utf8');
      assert.equal(frame.x, frame.index * CELL);
      assert.equal(frame.y, 0);
      assert.equal(frame.width, CELL);
      assert.equal(frame.height, CELL);
      assert.equal(frame.durationMs, source.durations[frame.index]);
      assert.ok(frame.durationMs > 0);
      assert.ok(standalone.includes(frameBody(source, frame.index)));
      assert.ok(sheet.includes(`<g transform="translate(${frame.x} 0)">${frameBody(source, frame.index)}</g>`));
    }
    if (source.visualCue) assert.ok(source.visualCue.frame < clip.frames.length);
    if (source.asset === 'player' || source.asset === 'sentinel') assert.deepEqual(clip.anchor, ANCHOR);
  }
});

test('Godot export scales rectangles and preserves variable timing and loop flags', () => {
  for (const source of CLIPS) {
    const clip = { ...source, frames: source.durations.map((durationMs) => ({ durationMs })), anchor: ANCHOR };
    for (const size of [48, 96, 192]) {
      const result = spriteFrames(clip, size, CELL, 'sprite.png');
      assert.ok(result.startsWith(`[gd_resource type="SpriteFrames" load_steps=${source.durations.length + 2} format=3]`));
      assert.ok(result.includes(`"loop": ${source.loop}`));
      assert.ok(result.includes('"speed": 10.0'));
      const durations = [...result.matchAll(/"duration": ([\d.]+)/g)].map((match) => Number(match[1]));
      assert.equal(durations.length, source.durations.length);
      durations.forEach((value, index) => assert.ok(Math.abs(value / 10 - source.durations[index]! / 1000) < 1e-10));
      source.durations.forEach((_, index) => assert.ok(result.includes(`region = Rect2(${index * size}, 0, ${size}, ${size})`)));
    }
  }
});

test('Godot scenes apply scaled and mirrored anchors without mirroring twice', () => {
  const clip = { action: 'test', loop: false, frames: [{ durationMs: 80 }], anchor: { x: 30, y: 80 } };
  assert.deepEqual(godotAnchor(clip, 192, 96, true), { x: 132, y: 160 });
  const scene = spriteScene(clip, 192, 96, 'sprite.tres', true);
  assert.ok(scene.includes('centered = false\noffset = Vector2(-132, -160)'));
  assert.ok(scene.includes('path="sprite.tres"'));
  assert.doesNotMatch(scene, /flip_h/);
  assert.throws(() => spriteFrames(clip, 0, 96, 'sprite.png'));
  assert.throws(() => spriteFrames({ ...clip, frames: [{ durationMs: NaN }] }, 96, 96, 'sprite.png'));
});

test('all SVGs are standalone and contain no runtime animation or external references', () => {
  for (const clip of CLIPS) {
    const frames = clip.durations.map((_, index) => frameBody(clip, index));
    for (const frame of frames) {
      assert.doesNotMatch(frame, /NaN|Infinity|undefined|<script|<animate|<foreignObject|href=|url\(/);
    }
    assert.ok(new Set(frames).size > 1, `${clip.asset}/${clip.action} must animate`);
    assert.throws(() => frameBody(clip, -1), RangeError);
    assert.throws(() => frameBody(clip, clip.durations.length), RangeError);
  }
});
