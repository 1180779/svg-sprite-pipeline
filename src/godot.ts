/** Godot 4 text-resource serialization, shared by Node generation and the browser. */
export interface GodotClip {
  action: string;
  loop: boolean;
  frames: readonly { durationMs: number }[];
  anchor: { x: number; y: number };
}

function validate(clip: GodotClip, size: number, logicalSize: number): void {
  if (!Number.isInteger(size) || size <= 0 || !Number.isFinite(logicalSize) || logicalSize <= 0) {
    throw new Error('Frame sizes must be positive; raster size must be a whole number.');
  }
  if (!clip.action || clip.frames.length === 0 || clip.frames.some((frame) => !Number.isFinite(frame.durationMs) || frame.durationMs <= 0)) {
    throw new Error('An animation needs a name and frames with positive finite durations.');
  }
  if (![clip.anchor.x, clip.anchor.y].every(Number.isFinite)) throw new Error('Invalid anchor.');
}

export function godotAnchor(clip: GodotClip, size: number, logicalSize: number, mirrored = false): { x: number; y: number } {
  validate(clip, size, logicalSize);
  return { x: (mirrored ? logicalSize - clip.anchor.x : clip.anchor.x) * size / logicalSize,
    y: clip.anchor.y * size / logicalSize };
}

export function spriteFrames(clip: GodotClip, size: number, logicalSize: number, sheetPath: string, mirrored = false): string {
  const anchor = godotAnchor(clip, size, logicalSize, mirrored);
  const subresources = clip.frames.map((_, index) =>
    `[sub_resource type="AtlasTexture" id="AtlasTexture_${index}"]\natlas = ExtResource("1_sheet")\nregion = Rect2(${index * size}, 0, ${size}, ${size})\nfilter_clip = true\n`).join('\n');
  // Godot duration is relative to the animation FPS: (ms / 100) / 10 = seconds.
  const frames = clip.frames.map((frame, index) =>
    `{\n"duration": ${frame.durationMs / 100},\n"texture": SubResource("AtlasTexture_${index}")\n}`).join(', ');
  return `[gd_resource type="SpriteFrames" load_steps=${clip.frames.length + 2} format=3]\n\n`
    + `[ext_resource type="Texture2D" path=${JSON.stringify(sheetPath)} id="1_sheet"]\n\n`
    + subresources + '\n[resource]\n'
    + `animations = [{\n"frames": [${frames}],\n"loop": ${clip.loop},\n"name": &${JSON.stringify(clip.action)},\n"speed": 10.0\n}]\n`
    + `metadata/pipeline_anchor = Vector2(${anchor.x}, ${anchor.y})\n`;
}

/** A scene applies the anchor; SpriteFrames alone cannot set a node's offset. */
export function spriteScene(clip: GodotClip, size: number, logicalSize: number, framesPath: string, mirrored = false): string {
  const anchor = godotAnchor(clip, size, logicalSize, mirrored);
  return '[gd_scene load_steps=2 format=3]\n\n'
    + `[ext_resource type="SpriteFrames" path=${JSON.stringify(framesPath)} id="1_frames"]\n\n`
    + '[node name="Sprite" type="AnimatedSprite2D"]\n'
    + 'sprite_frames = ExtResource("1_frames")\n'
    + `animation = &${JSON.stringify(clip.action)}\nautoplay = ${JSON.stringify(clip.action)}\n`
    + `centered = false\noffset = Vector2(${-anchor.x}, ${-anchor.y})\n`;
}
