// Records what the engine asks Web Audio to do, so it can be tested without a speaker.
export function createFakeContext() {
  const created = { oscillators: [], noise: [], gains: [] };
  const param = () => ({
    value: 1,
    calls: [],
    setValueAtTime(v, t) { this.calls.push(['set', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.calls.push(['exp', v, t]); },
    linearRampToValueAtTime(v, t) { this.calls.push(['lin', v, t]); },
  });
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    state: 'suspended',
    destination: { name: 'destination' },
    resumed: 0,
    resume() { this.resumed += 1; this.state = 'running'; return Promise.resolve(); },
    createGain() {
      const g = { gain: param(), connect(to) { g.to = to; return to; } };
      created.gains.push(g);
      return g;
    },
    createOscillator() {
      const o = {
        type: 'sine',
        frequency: param(),
        started: [],
        connect(to) { o.to = to; return to; },
        start(t) { o.started.push(t); },
        stop(t) { o.stopped = t; },
      };
      created.oscillators.push(o);
      return o;
    },
    createBuffer(channels, length) {
      return { length, getChannelData: () => new Float32Array(length) };
    },
    createBufferSource() {
      const s = {
        connect(to) { s.to = to; return to; },
        start(t) { s.startedAt = t; },
        stop(t) { s.stopped = t; },
      };
      created.noise.push(s);
      return s;
    },
  };
  return { ctx, created };
}

export function memoryStorage() {
  const data = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

export function fakeTimers() {
  const t = { callback: null, cleared: 0 };
  t.setInterval = (fn) => { t.callback = fn; return 1; };
  t.clearInterval = () => { t.callback = null; t.cleared += 1; };
  return t;
}
