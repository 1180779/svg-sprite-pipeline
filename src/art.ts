/** Logical coordinates remain unchanged when rasterizing at another resolution. */
export const CELL = 96;
export const ANCHOR = { x: 48, y: 80 } as const;
export const PALETTE = {
  outline: '#202733', armor: '#647588', light: '#9bafbf', dark: '#394655',
  skin: '#c4a58b', cape: '#66568c', energy: '#c3a1ff', flash: '#f5eeff',
  moss: '#617a58', mossLight: '#91a978', mossDark: '#354b3d', danger: '#ef917d',
} as const;

export type Asset = 'player' | 'sentinel' | 'projectile' | 'parry-fx';
export type Action = 'idle' | 'run' | 'jump' | 'parry' | 'hurt' | 'move' | 'shoot' | 'fly' | 'burst';
export interface Clip {
  asset: Asset;
  action: Action;
  durations: readonly number[];
  loop: boolean;
  /** Visual cue only: engines must define their own gameplay events. */
  visualCue?: { frame: number; label: string };
}

const repeat = (count: number, ms: number): number[] => Array.from({ length: count }, () => ms);
export const CLIPS: readonly Clip[] = [
  { asset: 'player', action: 'idle', durations: repeat(4, 240), loop: true },
  { asset: 'player', action: 'run', durations: repeat(8, 80), loop: true },
  { asset: 'player', action: 'jump', durations: [90, 80, 110, 160, 100, 100], loop: false },
  { asset: 'player', action: 'parry', durations: [60, 50, 80, 80, 70, 100], loop: false,
    visualCue: { frame: 2, label: 'guard flash (visual only)' } },
  { asset: 'player', action: 'hurt', durations: [70, 90, 100, 120], loop: false },
  { asset: 'sentinel', action: 'idle', durations: repeat(4, 260), loop: true },
  { asset: 'sentinel', action: 'move', durations: repeat(8, 100), loop: true },
  { asset: 'sentinel', action: 'shoot', durations: [120, 100, 70, 70, 100, 140], loop: false,
    visualCue: { frame: 2, label: 'muzzle flash (visual only)' } },
  { asset: 'sentinel', action: 'hurt', durations: [80, 90, 100, 120], loop: false },
  { asset: 'projectile', action: 'fly', durations: repeat(4, 70), loop: true },
  { asset: 'parry-fx', action: 'burst', durations: [40, 50, 60, 70, 80, 100], loop: false },
];

export function number(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function rect(x: number, y: number, w: number, h: number, fill: string): string {
  return `<rect x="${number(x)}" y="${number(y)}" width="${number(w)}" height="${number(h)}" fill="${fill}"/>`;
}

function group(body: string, transform: string, opacity = 1): string {
  return `<g transform="${transform}" opacity="${number(opacity)}">${body}</g>`;
}

function line(points: readonly (readonly [number, number])[], color: string, width: number): string {
  return `<polyline points="${points.map(([x, y]) => `${number(x)},${number(y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="bevel"/>`;
}

function leg(hipX: number, hipY: number, footX: number, footY: number, dark: boolean): string {
  const knee: readonly [number, number] = [(hipX + footX) / 2 + 3, (hipY + footY) / 2];
  return line([[hipX, hipY], knee, [footX, footY - 3]], PALETTE.outline, 10)
    + line([[hipX, hipY], knee, [footX, footY - 3]], dark ? PALETTE.dark : PALETTE.armor, 6)
    + rect(footX - 4, footY - 5, 12, 5, PALETTE.outline)
    + rect(footX - 2, footY - 5, 8, 2, PALETTE.light);
}

function player(action: Action, frame: number, count: number): string {
  const phase = frame / count * Math.PI * 2;
  const moving = action === 'run';
  const jumpLift = action === 'jump' ? [0, 5, 12, 14, 6, 0][frame]! : 0;
  const bob = moving ? -Math.abs(Math.sin(phase)) * 2 : action === 'idle' ? [0, -1, -2, -1][frame]! : 0;
  const hurt = action === 'hurt' ? [-4, -3, -1, 0][frame]! : 0;
  const stride = moving ? Math.cos(phase) * 11 : 0;
  const liftL = moving ? Math.max(0, Math.sin(phase)) * 7 : jumpLift;
  const liftR = moving ? Math.max(0, -Math.sin(phase)) * 7 : jumpLift;
  const guard = action === 'parry' ? [0, 0.6, 1, 1, 0.5, 0][frame]! : 0;
  const handX = 64 + guard * 3;
  const handY = 54 - guard * 13;
  const backArm = line([[36, 41], [31 - stride / 3, 49], [30 - stride / 2, 58]], PALETTE.outline, 9)
    + line([[36, 41], [31 - stride / 3, 49], [30 - stride / 2, 58]], PALETTE.dark, 5);
  const cape = `<path d="M35 34 L28 ${63 + Math.sin(phase) * 2} L39 59 L44 35Z" fill="${PALETTE.cape}" stroke="${PALETTE.outline}" stroke-width="2"/>`;
  const torso = rect(35, 35, 24, 24, PALETTE.outline) + rect(37, 37, 20, 18, PALETTE.armor)
    + rect(39, 38, 4, 15, PALETTE.light) + rect(36, 54, 23, 5, PALETTE.dark)
    + rect(47, 55, 5, 4, PALETTE.energy);
  const head = rect(39, 20, 20, 17, PALETTE.outline) + rect(41, 23, 16, 12, PALETTE.skin)
    + rect(37, 19, 24, 7, PALETTE.armor) + rect(40, 16, 17, 5, PALETTE.light)
    + rect(49, 28, 3, 3, PALETTE.outline) + rect(56, 28, 2, 3, PALETTE.outline);
  const arm = line([[57, 40], [61, 46 - guard * 4], [handX, handY]], PALETTE.outline, 10)
    + line([[57, 40], [61, 46 - guard * 4], [handX, handY]], PALETTE.armor, 6)
    + rect(handX - 3, handY - 3, 6, 6, PALETTE.skin);
  const sword = group(
    `<path d="M-2 -9 L-2 -25 L0 -29 L3 -25 L3 -9Z" fill="${PALETTE.light}" stroke="${PALETTE.outline}" stroke-width="1.5"/>`
    + rect(0, -24, 1, 14, PALETTE.flash) + rect(-6, -9, 12, 3, PALETTE.cape)
    + rect(-2, -6, 4, 9, PALETTE.dark),
    `translate(${number(handX)} ${number(handY)}) rotate(${number(65 - guard * 50)})`,
  );
  let result = leg(42, 57 + bob, 41 - stride, 80 - liftL, true)
    + leg(53, 57 + bob, 53 + stride, 80 - liftR, false)
    + group(cape + backArm + torso + head + arm + sword, `translate(0 ${number(bob)})`);
  result = group(result, `translate(${hurt} 0)`);
  if (action === 'parry' && (frame === 2 || frame === 3)) {
    result += `<path d="M76 23 L81 31 L88 34 L80 38 L76 46 L72 38 L65 34 L73 31Z" fill="${frame === 2 ? PALETTE.flash : PALETTE.energy}"/>`;
  }
  return result;
}

function sentinel(action: Action, frame: number, count: number): string {
  const phase = frame / count * Math.PI * 2;
  const moving = action === 'move';
  const recoil = action === 'shoot' ? [0, -1, -5, -3, -1, 0][frame]! : action === 'hurt' ? [-4, -2, -1, 0][frame]! : 0;
  const bob = moving ? -Math.abs(Math.sin(phase)) * 2 : Math.sin(phase);
  const stride = moving ? Math.cos(phase) * 7 : 0;
  const feet = leg(38, 63, 37 - stride, 80 - Math.max(0, Math.sin(phase)) * (moving ? 4 : 0), true)
    + leg(55, 63, 55 + stride, 80 - Math.max(0, -Math.sin(phase)) * (moving ? 4 : 0), false);
  const body = `<path d="M29 43 L35 36 L58 36 L66 45 L63 65 L29 65Z" fill="${PALETTE.mossDark}" stroke="${PALETTE.outline}" stroke-width="2"/>`
    + rect(32, 44, 29, 17, PALETTE.moss) + rect(35, 46, 4, 11, PALETTE.mossLight)
    + rect(35, 28, 27, 15, PALETTE.outline) + rect(37, 30, 23, 11, PALETTE.moss)
    + rect(40, 33, 5, 4, PALETTE.danger) + rect(53, 33, 5, 4, PALETTE.danger)
    + rect(40, 22, 5, 7, PALETTE.mossDark) + rect(48, 20, 5, 9, PALETTE.mossLight)
    + rect(56, 24, 4, 5, PALETTE.mossDark) + rect(55, 47, 20, 10, PALETTE.outline)
    + rect(58, 49, 14, 5, PALETTE.dark) + rect(70, 49, 3, 5, PALETTE.danger)
    + rect(43, 48, 5, 5, PALETTE.mossDark) + rect(50, 57, 4, 3, PALETTE.mossLight);
  const flash = action === 'shoot' && frame === 2
    ? `<path d="M76 46 L82 49 L90 51 L82 54 L76 59 L78 52Z" fill="${PALETTE.danger}"/>` : '';
  return feet + group(body, `translate(${recoil} ${number(bob)})`) + flash;
}

function effect(asset: Asset, frame: number, count: number): string {
  if (asset === 'projectile') {
    const flicker = frame % 2 * 2;
    return `<path d="M23 ${45 - flicker} L42 44 L42 52 L23 ${51 + flicker} L29 48Z" fill="${PALETTE.danger}" opacity="0.5"/>`
      + `<path d="M38 48 L45 42 L57 42 L64 48 L57 54 L45 54Z" fill="${PALETTE.danger}"/>`
      + rect(46, 45, 10, 6, PALETTE.flash);
  }
  const radius = 8 + frame * 5;
  const opacity = 1 - frame / count;
  let body = `<circle cx="48" cy="48" r="${radius}" fill="none" stroke="${PALETTE.energy}" stroke-width="${Math.max(1, 5 - frame)}"/>`;
  for (let i = 0; i < 8; i++) {
    body += group(rect(-1, -radius - 5, 2, 5, PALETTE.flash), `translate(48 48) rotate(${i * 45})`);
  }
  return group(body, 'translate(0 0)', opacity);
}

export function frameBody(clip: Clip, frame: number): string {
  if (!Number.isInteger(frame) || frame < 0 || frame >= clip.durations.length) {
    throw new RangeError(`Invalid frame ${frame} for ${clip.asset}/${clip.action}`);
  }
  if (clip.asset === 'player') return player(clip.action, frame, clip.durations.length);
  if (clip.asset === 'sentinel') return sentinel(clip.action, frame, clip.durations.length);
  return effect(clip.asset, frame, clip.durations.length);
}

export function svg(body: string, width = CELL, height = CELL): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${body}</svg>\n`;
}
