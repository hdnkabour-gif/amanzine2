// ══════════════════════════════════════════════════════
// AMANZINE SHOP — Sound System
// Beautiful, calming notification sounds
// ══════════════════════════════════════════════════════

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, duration: number, vol: number, type: OscillatorType = 'sine', delay = 0) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain); gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.05);
  } catch {}
}

// 🎵 New order — warm ascending chime (Sa-Har feel)
export function playNewOrder() {
  // Oriental pentatonic ascending: Do Re Mi Sol La
  const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
  notes.forEach((freq, i) => {
    tone(freq, 0.4, 0.12, 'sine', i * 0.12);
  });
  // Bass warmth
  tone(262, 0.5, 0.08, 'triangle', 0);
}

// ✅ Order approved — satisfied resolving chord
export function playApproved() {
  tone(523, 0.3, 0.1, 'sine', 0);
  tone(659, 0.3, 0.1, 'sine', 0.05);
  tone(784, 0.4, 0.1, 'sine', 0.1);
  tone(1047, 0.5, 0.12, 'sine', 0.18);
}

// 🚚 Order shipped
export function playShipped() {
  tone(784, 0.25, 0.1, 'sine', 0);
  tone(880, 0.25, 0.1, 'sine', 0.15);
  tone(988, 0.3, 0.1, 'sine', 0.3);
}

// 📦 Delivered — happy resolution
export function playDelivered() {
  // Full chord: C major arpeggio up
  [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
    tone(f, 0.35, 0.1, 'sine', i * 0.08);
  });
  tone(523, 0.8, 0.06, 'triangle', 0.5);
}

// 💬 New message
export function playMessage() {
  tone(880, 0.15, 0.08, 'sine', 0);
  tone(1108, 0.2, 0.08, 'sine', 0.1);
}

// ⚠️ Warning
export function playWarning() {
  tone(440, 0.2, 0.08, 'triangle', 0);
  tone(330, 0.3, 0.08, 'triangle', 0.2);
}

// 🎉 Success general
export function playSuccess() {
  tone(659, 0.2, 0.1, 'sine', 0);
  tone(784, 0.2, 0.1, 'sine', 0.1);
  tone(988, 0.3, 0.1, 'sine', 0.2);
}

export const Sounds = {
  newOrder: playNewOrder,
  approved: playApproved,
  shipped:  playShipped,
  delivered: playDelivered,
  message:  playMessage,
  warning:  playWarning,
  success:  playSuccess,
};
