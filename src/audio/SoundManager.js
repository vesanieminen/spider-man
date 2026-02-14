let ctx = null;

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playTone(frequency, duration, type = 'square', volume = 0.15, decay = true) {
  const ac = getContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  if (decay) {
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

function playNoise(duration, volume = 0.1) {
  const ac = getContext();
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  source.start(ac.currentTime);
}

export const SoundManager = {
  webShoot() {
    // "Thwip" - quick high-pitched snap
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    osc.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.08);
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.1);
    playNoise(0.04, 0.06);
  },

  webSwing() {
    // Whooshing while swinging
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 150;
    osc.frequency.linearRampToValueAtTime(300, ac.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(100, ac.currentTime + 0.3);
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
    playNoise(0.2, 0.02);
  },

  webRelease() {
    playTone(600, 0.06, 'sine', 0.06);
  },

  punch() {
    playTone(200, 0.08, 'square', 0.12);
    playNoise(0.06, 0.1);
  },

  kick() {
    playTone(140, 0.12, 'square', 0.15);
    playNoise(0.1, 0.12);
    playTone(80, 0.1, 'sine', 0.2);
  },

  heavyHit() {
    playTone(50, 0.2, 'sine', 0.25);
    playTone(100, 0.15, 'square', 0.12);
    playNoise(0.12, 0.15);
  },

  diveKickImpact() {
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 80;
    osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.3);
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
    playNoise(0.2, 0.18);
  },

  enemyHit() {
    playTone(160, 0.1, 'square', 0.15);
    playNoise(0.08, 0.15);
    playTone(60, 0.15, 'sine', 0.2);
  },

  enemyDeath() {
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 400;
    osc.frequency.exponentialRampToValueAtTime(50, ac.currentTime + 0.5);
    gain.gain.value = 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.5);
    playNoise(0.3, 0.1);
  },

  comboArpeggio(comboCount) {
    // Rising notes based on combo count
    const baseNote = 440;
    const notes = Math.min(comboCount, 8);
    for (let i = 0; i < notes; i++) {
      const freq = baseNote * Math.pow(1.12, i);
      setTimeout(() => playTone(freq, 0.08, 'square', 0.06), i * 40);
    }
  },

  styleBonus() {
    // Quick ascending fanfare
    const notes = [660, 880, 1100];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.1, 'triangle', 0.08), i * 60);
    });
  },

  jump() {
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 250;
    osc.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.1);
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.12);
  },

  land() {
    playTone(80, 0.06, 'sine', 0.08);
  },

  menuSelect() {
    playTone(660, 0.08, 'square', 0.08);
    setTimeout(() => playTone(880, 0.1, 'square', 0.1), 60);
  },

  gameOver() {
    const notes = [523, 440, 349, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sawtooth', 0.08), i * 200);
    });
  },

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'square', 0.1), i * 150);
    });
  },

  bombExplode() {
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 100;
    osc.frequency.exponentialRampToValueAtTime(20, ac.currentTime + 0.3);
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
    playNoise(0.2, 0.15);
  },

  ninjaThrow() {
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 800;
    osc.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.1);
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.12);
  },

  whoosh() {
    playNoise(0.1, 0.04);
  },
};
