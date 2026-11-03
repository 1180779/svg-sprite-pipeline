import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ANCHOR, CELL, CLIPS, frameBody } from './art.js';

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
