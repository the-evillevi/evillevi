/* One AudioContext for the app's lifetime. Browsers block contexts created
 * outside user gestures, so prime() runs on Start clicks — by the time a
 * completion beep fires from the interval, the context is already unlocked. */

let context: AudioContext | null = null;

export function primeAudio() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
}

export function playBeep(volume: number) {
  primeAudio();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  gain.gain.value = volume / 300;
  oscillator.frequency.value = 660;
  oscillator.start();
  oscillator.stop(context.currentTime + 0.16);
}
