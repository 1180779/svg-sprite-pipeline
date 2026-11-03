interface PreviewFrame {
  index: number; x: number; y: number; width: number; height: number; durationMs: number;
}
interface PreviewClip {
  id: string; asset: string; action: string; loop: boolean;
  anchor: { x: number; y: number }; facing: string;
  sheet: string; sheetWidth: number; sheetHeight: number;
  visualCue: { frame: number; label: string } | null;
  frames: PreviewFrame[]; svg: string;
}
interface Catalog { logicalFrameSize: number; palette: Record<string, string>; clips: PreviewClip[] }

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}
function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const result = canvas.getContext('2d');
  if (!result) throw new Error('Canvas 2D is unavailable in this browser.');
  return result;
}
const catalog: Catalog = JSON.parse(element('catalog').textContent ?? '{}') as Catalog;
const select = element<HTMLSelectElement>('clip');
const facing = element<HTMLSelectElement>('facing');
const sizeInput = element<HTMLInputElement>('size');
const slider = element<HTMLInputElement>('frame');
const play = element<HTMLButtonElement>('play');
const pngButton = element<HTMLButtonElement>('png');
const metadataButton = element<HTMLButtonElement>('metadata');
const guides = element<HTMLInputElement>('guides');
const canvas = element<HTMLCanvasElement>('preview');
const ctx = context(canvas);
const statusElement = element('status');
let current = catalog.clips[0]!;
let image: HTMLImageElement | null = null;
let frameIndex = 0;
let playing = true;
let started = performance.now();
let pausedAt = 0;
let loadVersion = 0;

for (const clip of catalog.clips) {
  const option = document.createElement('option');
  option.value = clip.id;
  option.textContent = `${clip.asset} / ${clip.action}`;
  select.append(option);
}
for (const [name, color] of Object.entries(catalog.palette)) {
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = color;
  swatch.title = `${name}: ${color}`;
  swatch.setAttribute('aria-label', swatch.title);
  element('palette').append(swatch);
}

function duration(): number { return current.frames.reduce((sum, frame) => sum + frame.durationMs, 0); }
function mirrored(): boolean { return facing.value === 'left'; }
function drawFrame(target: CanvasRenderingContext2D, index: number, size: number, x = 0): void {
  if (!image) return;
  const frame = current.frames[index]!;
  target.save();
  target.translate(x + (mirrored() ? size : 0), 0);
  if (mirrored()) target.scale(-1, 1);
  target.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, size, size);
  target.restore();
}

function draw(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawFrame(ctx, frameIndex, canvas.width);
  if (guides.checked) {
    const scale = canvas.width / catalog.logicalFrameSize;
    const anchorX = (mirrored() ? catalog.logicalFrameSize - current.anchor.x : current.anchor.x) * scale;
    const anchorY = current.anchor.y * scale;
    ctx.strokeStyle = '#8fa4ad';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, anchorY); ctx.lineTo(canvas.width, anchorY); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = '#eab67d';
    ctx.beginPath(); ctx.moveTo(anchorX - 6, anchorY); ctx.lineTo(anchorX + 6, anchorY);
    ctx.moveTo(anchorX, anchorY - 6); ctx.lineTo(anchorX, anchorY + 6); ctx.stroke();
  }
  slider.value = String(frameIndex);
  element('counter').textContent = `${frameIndex + 1} / ${current.frames.length}`;
}

function tick(now: number): void {
  if (playing) {
    const elapsed = now - started;
    let offset = current.loop ? elapsed % duration() : Math.min(elapsed, duration() - 1);
    frameIndex = 0;
    while (frameIndex < current.frames.length - 1 && offset >= current.frames[frameIndex]!.durationMs) {
      offset -= current.frames[frameIndex]!.durationMs;
      frameIndex++;
    }
    if (!current.loop && elapsed >= duration()) {
      playing = false; pausedAt = duration(); play.textContent = 'Replay';
    }
  }
  draw();
  requestAnimationFrame(tick);
}

async function loadClip(): Promise<void> {
  const version = ++loadVersion;
  current = catalog.clips.find((clip) => clip.id === select.value)!;
  image = null; pngButton.disabled = true; metadataButton.disabled = true;
  slider.max = String(current.frames.length - 1);
  frameIndex = 0; pausedAt = 0; playing = false;
  statusElement.textContent = 'Loading vector sheet…';
  const next = new Image();
  next.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(current.svg)}`;
  try {
    await next.decode();
    if (version !== loadVersion) return;
    image = next;
    const strip = next.cloneNode() as HTMLImageElement;
    strip.alt = `${current.id}, all ${current.frames.length} frames in order`;
    element('sheet').replaceChildren(strip);
    started = performance.now(); playing = true; play.textContent = 'Pause';
    pngButton.disabled = false; metadataButton.disabled = false;
    element('info').textContent = `${current.frames.length} frames · ${duration()} ms · ${current.loop ? 'loop' : 'one shot'} · logical cell ${catalog.logicalFrameSize} × ${catalog.logicalFrameSize}\nAnchor (${current.anchor.x}, ${current.anchor.y})${current.visualCue ? ` · ${current.visualCue.label} at frame ${current.visualCue.frame + 1}` : ''}`;
    statusElement.textContent = 'Ready. Export uses the vector source at your chosen size.';
  } catch (error) {
    if (version === loadVersion) statusElement.textContent = `Could not load SVG: ${String(error)}`;
  }
}

function exportSize(): number {
  const size = Number(sizeInput.value);
  if (!Number.isInteger(size) || size < 16 || size > 1024) throw new Error('Choose a whole-number frame size from 16 to 1024.');
  return size;
}
function filename(size: number): string { return `${current.id}-${facing.value}-${size}`; }
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
pngButton.addEventListener('click', () => {
  try {
    const size = exportSize();
    const output = document.createElement('canvas');
    output.width = size * current.frames.length; output.height = size;
    const outputContext = context(output);
    current.frames.forEach((_, index) => drawFrame(outputContext, index, size, index * size));
    const name = `${filename(size)}.png`;
    output.toBlob((blob) => {
      if (!blob) { statusElement.textContent = 'PNG encoding failed.'; return; }
      download(blob, name); statusElement.textContent = `Exported ${name}. Download matching JSON with the same settings.`;
    }, 'image/png');
  } catch (error) { statusElement.textContent = String(error); }
});
metadataButton.addEventListener('click', () => {
  try {
    const size = exportSize();
    const scale = size / catalog.logicalFrameSize;
    const data = { schemaVersion: 1, id: current.id, asset: current.asset, action: current.action,
      loop: current.loop, facing: facing.value, sheet: `${filename(size)}.png`,
      sheetWidth: size * current.frames.length, sheetHeight: size,
      anchor: { x: (mirrored() ? catalog.logicalFrameSize - current.anchor.x : current.anchor.x) * scale, y: current.anchor.y * scale },
      visualCue: current.visualCue,
      frames: current.frames.map((frame) => ({ index: frame.index, x: frame.index * size,
        y: 0, width: size, height: size, durationMs: frame.durationMs })) };
    download(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }), `${filename(size)}.json`);
    statusElement.textContent = 'Exported matching metadata. Frame indices are zero-based; anchors are in frame pixels.';
  } catch (error) { statusElement.textContent = String(error); }
});
select.addEventListener('change', () => { void loadClip(); });
facing.addEventListener('change', draw);
play.addEventListener('click', () => {
  if (playing) { pausedAt = performance.now() - started; playing = false; play.textContent = 'Play'; }
  else { if (pausedAt >= duration()) pausedAt = 0; started = performance.now() - pausedAt; playing = true; play.textContent = 'Pause'; }
});
slider.addEventListener('input', () => {
  frameIndex = Number(slider.value); playing = false; play.textContent = 'Play';
  pausedAt = current.frames.slice(0, frameIndex).reduce((sum, frame) => sum + frame.durationMs, 0);
  draw();
});
void loadClip();
requestAnimationFrame(tick);
