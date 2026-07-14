/**
 * צלילי כפתורים — עדינים (HTML Audio + WAV).
 */

import { isButtonSoundEnabled as readEnabled } from '@/lib/a11y-settings';
import { buildWavDataUri, type Tone } from '@/lib/sound-wav';

type SoundId = 'click' | 'welcome' | 'cartAdd' | 'cartUp' | 'cartDown' | 'cartClose';

const cache: Partial<Record<SoundId, string>> = {};

const CLICK: Tone[] = [
  { freq: 680, freqEnd: 600, start: 0, len: 0.045, vol: 0.14, attack: 0.01, release: 0.032 },
];

const WELCOME: Tone[] = [
  { freq: 349, start: 0, len: 0.16, vol: 0.17, attack: 0.02, release: 0.07 },
  { freq: 440, start: 0.13, len: 0.16, vol: 0.16, attack: 0.02, release: 0.07 },
  { freq: 523, start: 0.26, len: 0.28, vol: 0.17, attack: 0.022, release: 0.09 },
];

/** הוספה לסל — נגיעה כפולה רכה (מז'ור) */
const CART_ADD: Tone[] = [
  { freq: 523, start: 0, len: 0.1, vol: 0.11, attack: 0.012, release: 0.065 },
  { freq: 659, start: 0.07, len: 0.14, vol: 0.1, attack: 0.014, release: 0.075 },
];

/** +1 כמות — טיפה קלה למעלה */
const CART_UP: Tone[] = [
  { freq: 740, freqEnd: 784, start: 0, len: 0.038, vol: 0.085, attack: 0.008, release: 0.028 },
];

/** −1 כמות — טיפה קלה למטה */
const CART_DOWN: Tone[] = [
  { freq: 620, freqEnd: 554, start: 0, len: 0.038, vol: 0.075, attack: 0.008, release: 0.028 },
];

/** סגירת סל — גלישה רכה למטה + נגיעה */
const CART_CLOSE: Tone[] = [
  { freq: 392, freqEnd: 262, start: 0, len: 0.13, vol: 0.095, attack: 0.01, release: 0.075 },
  { freq: 196, freqEnd: 165, start: 0.1, len: 0.09, vol: 0.07, attack: 0.006, release: 0.065 },
];

const DEFS: Record<SoundId, { tones: Tone[]; dur: number; vol: number }> = {
  click: { tones: CLICK, dur: 0.06, vol: 0.32 },
  welcome: { tones: WELCOME, dur: 0.58, vol: 0.42 },
  cartAdd: { tones: CART_ADD, dur: 0.22, vol: 0.36 },
  cartUp: { tones: CART_UP, dur: 0.05, vol: 0.3 },
  cartDown: { tones: CART_DOWN, dur: 0.05, vol: 0.28 },
  cartClose: { tones: CART_CLOSE, dur: 0.22, vol: 0.34 },
};

function uri(id: SoundId): string {
  if (cache[id]) return cache[id]!;
  const d = DEFS[id];
  cache[id] = buildWavDataUri(d.tones, d.dur);
  return cache[id]!;
}

function play(id: SoundId): void {
  if (typeof window === 'undefined') return;
  const el = new Audio(uri(id));
  el.volume = DEFS[id].vol;
  void el.play().catch(() => {});
}

export function isButtonSoundEnabled(): boolean {
  return readEnabled();
}

function guard(force: boolean): boolean {
  return force || isButtonSoundEnabled();
}

export function playButtonSound(_kind: 'click' | 'action' = 'click', force = false): void {
  if (!guard(force)) return;
  play('click');
}

export function playCartAdd(force = false): void {
  if (!guard(force)) return;
  play('cartAdd');
}

export function playCartQtyUp(force = false): void {
  if (!guard(force)) return;
  play('cartUp');
}

export function playCartQtyDown(force = false): void {
  if (!guard(force)) return;
  play('cartDown');
}

export function playCartClose(force = false): void {
  if (!guard(force)) return;
  play('cartClose');
}

export function playCheckoutWelcome(force = false): void {
  if (!guard(force)) return;
  play('welcome');
}

export function primeButtonSounds(): void {
  if (typeof window === 'undefined') return;
  (Object.keys(DEFS) as SoundId[]).forEach((id) => uri(id));
}
