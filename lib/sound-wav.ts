/** יצירת data:audio/wav — צלילים רכים ועדינים */

export type Tone = {
  freq: number;
  start: number;
  len: number;
  vol: number;
  /** גלישת תדר (אופציונלי) */
  freqEnd?: number;
  attack?: number;
  release?: number;
};

function sampleTone(t: number, tone: Tone): number {
  if (t < 0 || t >= tone.len) return 0;
  const attack = tone.attack ?? 0.014;
  const release = tone.release ?? 0.045;
  const env =
    Math.min(1, t / attack) *
    Math.min(1, (tone.len - t) / release);
  const progress = tone.len > 0 ? t / tone.len : 0;
  const freq = tone.freqEnd != null
    ? tone.freq + (tone.freqEnd - tone.freq) * progress
    : tone.freq;
  const fundamental = Math.sin(2 * Math.PI * freq * t);
  const warm = Math.sin(2 * Math.PI * freq * 2 * t) * 0.12;
  return (fundamental + warm) * tone.vol * env;
}

export function buildWavDataUri(tones: Tone[], totalSec: number, sampleRate = 44100): string {
  const frames = Math.ceil(totalSec * sampleRate);
  const samples = new Float32Array(frames);

  for (const tone of tones) {
    const i0 = Math.floor(tone.start * sampleRate);
    const i1 = Math.min(frames, i0 + Math.ceil(tone.len * sampleRate));
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / sampleRate;
      samples[i] += sampleTone(t, tone);
    }
  }

  let peak = 0;
  for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak > 0.95) {
    const scale = 0.9 / peak;
    for (let i = 0; i < frames; i++) samples[i] *= scale;
  }

  const dataSize = frames * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const w = (o: number, s: string) => { for (let j = 0; j < s.length; j++) view.setUint8(o + j, s.charCodeAt(j)); };

  w(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, dataSize, true);

  let off = 44;
  for (let i = 0; i < frames; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}
