export class AudioFeedback {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.5;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      console.log('Web Audio API not supported');
      this.enabled = false;
    }
  }

  playBeep(frequency = 800, duration = 150, type = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.15, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration / 1000);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration / 1000);
  }

  playIncrement() { this.playBeep(650, 120, 'sine'); }
  playDecrement() { this.playBeep(450, 120, 'sine'); }
  playReset()     { this.playBeep(300, 200, 'square'); }
  playAdd()       { this.playBeep(800, 100, 'triangle'); }

  playCelebration() {
    this.playBeep(523, 150, 'sine');
    setTimeout(() => this.playBeep(659, 150, 'sine'), 150);
    setTimeout(() => this.playBeep(784, 200, 'sine'), 300);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}
