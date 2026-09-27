// ─────────────────────────────────────────────────────────────
// محرك صوت إجرائي كامل (Web Audio API) — بلا ملفات خارجية
// أجواء: menu / city / indoor / lab / harbor + طبقة توتر + نبض قلب
// ─────────────────────────────────────────────────────────────
import type { AmbientProfile } from "./types";

export type SfxName =
  | "footstep"
  | "footstep_run"
  | "shot_pistol"
  | "shot_shotgun"
  | "dryfire"
  | "reload_start"
  | "reload_end"
  | "swing"
  | "hit_flesh"
  | "hit_head"
  | "pickup"
  | "paper"
  | "heal"
  | "door_open"
  | "door_close"
  | "door_locked"
  | "spit"
  | "acid_hit"
  | "thud"
  | "pump"
  | "ui_click"
  | "ui_hover"
  | "stinger_discover"
  | "stinger_danger"
  | "growl"
  | "growl_far"
  | "roar"
  | "thunder"
  | "radio_static"
  | "radio_beep"
  | "generator"
  | "explosion"
  | "metal_creak"
  | "alarm";

interface SfxOpts {
  volume?: number;
  pan?: number;
  rate?: number;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private ambNodes: { stop: () => void }[] = [];
  private ambTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAmbient: AmbientProfile | null = null;
  private threatGains: GainNode[] = [];
  private hbTimer: ReturnType<typeof setInterval> | null = null;
  private volumes = { master: 0.8, music: 0.7, sfx: 0.9 };
  private started = false;
  // طبقات بيئية مجدولة (5-c)
  private sirenTimer: ReturnType<typeof setTimeout> | null = null;
  private heliNodes: { gain: GainNode; nodes: (OscillatorNode | AudioBufferSourceNode)[] } | null = null;
  private fireTimer: ReturnType<typeof setInterval> | null = null;
  private fireLevel = 0;

  init() {
    if (this.started) {
      this.ctx?.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.volumes.music * 0.9;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.volumes.sfx;
    this.sfxBus.connect(this.master);
    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = this.volumes.music;
    this.ambBus.connect(this.master);

    // noise buffer 2s
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brownish
      data[i] = white * 0.4 + last * 3.2;
    }
    this.noiseBuf = buf;
    this.started = true;
  }

  setVolumes(v: { master?: number; music?: number; sfx?: number }) {
    Object.assign(this.volumes, v);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.9, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.volumes.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
  }

  private out(bus?: GainNode) {
    return bus ?? this.sfxBus;
  }

  private noiseSource(dur: number, rate = 1): AudioBufferSourceNode | null {
    if (!this.ctx || !this.noiseBuf) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = rate;
    return src;
  }

  private env(g: GainNode, t0: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  private panner(pan: number): StereoPannerNode | null {
    if (!this.ctx) return null;
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  }

  // ── public sfx ──
  play(name: SfxName, opts: SfxOpts = {}) {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.01;
    const vol = opts.volume ?? 1;
    const rate = opts.rate ?? 1;
    let dest: AudioNode = this.out();
    if (opts.pan) {
      const p = this.panner(opts.pan);
      if (p) {
        p.connect(this.out());
        dest = p;
      }
    }
    const S = (
      build: (d: GainNode) => { nodes: AudioNode[]; dur: number } | null,
    ) => {
      const g = ctx.createGain();
      g.connect(dest);
      const r = build(g);
      if (!r) return;
      setTimeout(() => {
        try {
          r.nodes.forEach((n) => (n as OscillatorNode & AudioBufferSourceNode).stop?.());
        } catch {
          /* noop */
        }
      }, (r.dur + 0.5) * 1000);
    };

    switch (name) {
      case "footstep":
      case "footstep_run": {
        const run = name === "footstep_run";
        S((g) => {
          const src = this.noiseSource(0.2, 0.8 + Math.random() * 0.4);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = 240 + Math.random() * 160;
          f.Q.value = 0.9;
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.005, (run ? 0.5 : 0.26) * vol, run ? 0.13 : 0.1);
          src.start(t0);
          src.stop(t0 + 0.25);
          return { nodes: [src], dur: 0.25 };
        });
        break;
      }
      case "shot_pistol":
        S((g) => {
          const src = this.noiseSource(0.4, 1.4);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.setValueAtTime(5200, t0);
          f.frequency.exponentialRampToValueAtTime(300, t0 + 0.22);
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.003, 0.85 * vol, 0.2);
          src.start(t0);
          src.stop(t0 + 0.4);
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(150, t0);
          o.frequency.exponentialRampToValueAtTime(55, t0 + 0.15);
          const og = ctx.createGain();
          this.env(og, t0, 0.003, 0.7 * vol, 0.16);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.25);
          return { nodes: [src, o], dur: 0.45 };
        });
        break;
      case "shot_shotgun":
        S((g) => {
          const src = this.noiseSource(0.6, 0.9);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.setValueAtTime(3600, t0);
          f.frequency.exponentialRampToValueAtTime(160, t0 + 0.34);
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.004, 1.0 * vol, 0.32);
          src.start(t0);
          src.stop(t0 + 0.6);
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(95, t0);
          o.frequency.exponentialRampToValueAtTime(38, t0 + 0.25);
          const og = ctx.createGain();
          this.env(og, t0, 0.004, 0.9 * vol, 0.28);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.4);
          return { nodes: [src, o], dur: 0.65 };
        });
        break;
      case "dryfire":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "square";
          o.frequency.value = 1800 + Math.random() * 400;
          const og = ctx.createGain();
          this.env(og, t0, 0.001, 0.12 * vol, 0.04);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.08);
          return { nodes: [o], dur: 0.1 };
        });
        break;
      case "reload_start":
      case "reload_end":
        S((g) => {
          for (let i = 0; i < 3; i++) {
            const o = ctx.createOscillator();
            o.type = "square";
            o.frequency.value = 700 + Math.random() * 900;
            const og = ctx.createGain();
            const tt = t0 + i * 0.07;
            this.env(og, tt, 0.001, 0.14 * vol, 0.05);
            o.connect(og);
            og.connect(dest);
            o.start(tt);
            o.stop(tt + 0.09);
          }
          return { nodes: [], dur: 0.3 };
        });
        break;
      case "swing":
        S((g) => {
          const src = this.noiseSource(0.3, 1.2);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.setValueAtTime(900, t0);
          f.frequency.exponentialRampToValueAtTime(2400, t0 + 0.18);
          f.Q.value = 1.4;
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.02, 0.3 * vol, 0.16);
          src.start(t0);
          src.stop(t0 + 0.3);
          return { nodes: [src], dur: 0.3 };
        });
        break;
      case "hit_flesh":
      case "hit_head": {
        const head = name === "hit_head";
        S((g) => {
          const src = this.noiseSource(0.25, 0.5);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = head ? 900 : 380;
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.004, (head ? 0.8 : 0.55) * vol, 0.14);
          src.start(t0);
          src.stop(t0 + 0.3);
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(head ? 220 : 130, t0);
          o.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
          const og = ctx.createGain();
          this.env(og, t0, 0.004, 0.6 * vol, 0.13);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.2);
          return { nodes: [src, o], dur: 0.3 };
        });
        break;
      }
      case "pickup":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(520, t0);
          o.frequency.setValueAtTime(780, t0 + 0.07);
          const og = ctx.createGain();
          this.env(og, t0, 0.01, 0.22 * vol, 0.16);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.25);
          return { nodes: [o], dur: 0.25 };
        });
        break;
      case "paper":
        S((g) => {
          const src = this.noiseSource(0.4, 2.2);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "highpass";
          f.frequency.value = 1800;
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.03, 0.2 * vol, 0.3);
          src.start(t0);
          src.stop(t0 + 0.4);
          return { nodes: [src], dur: 0.4 };
        });
        break;
      case "heal":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(300, t0);
          o.frequency.exponentialRampToValueAtTime(640, t0 + 0.5);
          const og = ctx.createGain();
          this.env(og, t0, 0.1, 0.18 * vol, 0.5);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.7);
          return { nodes: [o], dur: 0.7 };
        });
        break;
      case "door_open":
      case "door_close": {
        // صرير مفصلة — الإغلاق أخفض نغمة وينتهي بطرقة
        const closing = name === "door_close";
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          if (closing) {
            o.frequency.setValueAtTime(120 + Math.random() * 40, t0);
            o.frequency.linearRampToValueAtTime(46 + Math.random() * 18, t0 + 0.42);
          } else {
            o.frequency.setValueAtTime(70 + Math.random() * 30, t0);
            o.frequency.linearRampToValueAtTime(120 + Math.random() * 40, t0 + 0.5);
          }
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = closing ? 320 : 500;
          f.Q.value = 6;
          const lfo = ctx.createOscillator();
          lfo.frequency.value = closing ? 7 : 9;
          const lg = ctx.createGain();
          lg.gain.value = 40;
          lfo.connect(lg);
          lg.connect(o.frequency);
          o.connect(f);
          f.connect(g);
          this.env(g, t0, 0.08, 0.28 * vol, closing ? 0.42 : 0.55);
          if (closing) {
            // طرقة الإغلاق النهائية
            const src = this.noiseSource(0.16, 0.9);
            if (src) {
              const nf = ctx.createBiquadFilter();
              nf.type = "lowpass";
              nf.frequency.value = 900;
              const ng = ctx.createGain();
              this.env(ng, t0 + 0.36, 0.004, 0.3 * vol, 0.12);
              src.connect(nf);
              nf.connect(ng);
              ng.connect(dest);
              src.start(t0 + 0.36);
              src.stop(t0 + 0.56);
            }
          }
          o.start(t0);
          lfo.start(t0);
          o.stop(t0 + 0.75);
          lfo.stop(t0 + 0.75);
          return { nodes: [o, lfo], dur: 0.85 };
        });
        break;
      }
      case "door_locked":
        S((g) => {
          for (let i = 0; i < 4; i++) {
            const o = ctx.createOscillator();
            o.type = "square";
            o.frequency.value = 420 + Math.random() * 260;
            const og = ctx.createGain();
            const tt = t0 + i * 0.055;
            this.env(og, tt, 0.001, 0.16 * vol, 0.04);
            o.connect(og);
            og.connect(dest);
            o.start(tt);
            o.stop(tt + 0.08);
          }
          return { nodes: [], dur: 0.35 };
        });
        break;
      case "ui_click":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "triangle";
          o.frequency.value = 640;
          const og = ctx.createGain();
          this.env(og, t0, 0.002, 0.16 * vol, 0.06);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.1);
          return { nodes: [o], dur: 0.12 };
        });
        break;
      case "stinger_discover":
        S((g) => {
          [196, 207.65, 233.08, 466].forEach((fr, i) => {
            const o = ctx.createOscillator();
            o.type = i === 3 ? "triangle" : "sawtooth";
            o.frequency.value = fr;
            const og = ctx.createGain();
            this.env(og, t0 + i * 0.01, 0.02, 0.12 * vol, 1.6);
            const f = ctx.createBiquadFilter();
            f.type = "lowpass";
            f.frequency.value = 1400;
            o.connect(f);
            f.connect(og);
            og.connect(dest);
            o.start(t0);
            o.stop(t0 + 2);
          });
          return { nodes: [], dur: 2 };
        });
        break;
      case "stinger_danger":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(55, t0);
          o.frequency.exponentialRampToValueAtTime(110, t0 + 0.8);
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = 500;
          const og = ctx.createGain();
          this.env(og, t0, 0.05, 0.5 * vol, 1.1);
          o.connect(f);
          f.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 1.4);
          return { nodes: [o], dur: 1.5 };
        });
        break;
      case "growl":
      case "growl_far": {
        const far = name === "growl_far";
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          const base = 60 + Math.random() * 55;
          o.frequency.setValueAtTime(base, t0);
          o.frequency.linearRampToValueAtTime(base * (0.7 + Math.random() * 0.4), t0 + 1.1);
          const v = ctx.createOscillator();
          v.frequency.value = 5 + Math.random() * 6;
          const vg = ctx.createGain();
          vg.gain.value = 14;
          v.connect(vg);
          vg.connect(o.frequency);
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = far ? 300 : 750;
          const og = ctx.createGain();
          this.env(og, t0, 0.15, (far ? 0.1 : 0.3) * vol, 1.2);
          o.connect(f);
          f.connect(og);
          og.connect(dest);
          o.start(t0);
          v.start(t0);
          o.stop(t0 + 1.6);
          v.stop(t0 + 1.6);
          return { nodes: [o, v], dur: 1.6 };
        });
        break;
      }
      case "roar":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(140, t0);
          o.frequency.exponentialRampToValueAtTime(38, t0 + 1.2);
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = 900;
          const og = ctx.createGain();
          this.env(og, t0, 0.04, 0.75 * vol, 1.3);
          o.connect(f);
          f.connect(og);
          og.connect(dest);
          const src = this.noiseSource(1.4, 0.6);
          if (src) {
            const nf = ctx.createBiquadFilter();
            nf.type = "bandpass";
            nf.frequency.value = 420;
            const ng = ctx.createGain();
            this.env(ng, t0, 0.05, 0.4 * vol, 1.2);
            src.connect(nf);
            nf.connect(ng);
            ng.connect(dest);
            src.start(t0);
            src.stop(t0 + 1.5);
          }
          o.start(t0);
          o.stop(t0 + 1.5);
          return { nodes: [o], dur: 1.6 };
        });
        break;
      case "thunder":
        S((g) => {
          const src = this.noiseSource(3, 0.4);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.setValueAtTime(120, t0);
          f.frequency.exponentialRampToValueAtTime(600, t0 + 0.4);
          f.frequency.exponentialRampToValueAtTime(60, t0 + 2.4);
          src.connect(f);
          f.connect(g);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.55 * vol, t0 + 0.25);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
          src.start(t0);
          src.stop(t0 + 2.8);
          return { nodes: [src], dur: 2.8 };
        });
        break;
      case "radio_static":
        S((g) => {
          const src = this.noiseSource(1.2, 1.8);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = 1700;
          f.Q.value = 0.6;
          src.connect(f);
          f.connect(g);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.22 * vol, t0 + 0.1);
          g.gain.setValueAtTime(0.22 * vol, t0 + 0.9);
          g.gain.linearRampToValueAtTime(0.0001, t0 + 1.15);
          src.start(t0);
          src.stop(t0 + 1.2);
          return { nodes: [src], dur: 1.2 };
        });
        break;
      case "radio_beep":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.value = 1180;
          const og = ctx.createGain();
          this.env(og, t0, 0.005, 0.14 * vol, 0.16);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.25);
          return { nodes: [o], dur: 0.3 };
        });
        break;
      case "generator":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "square";
          o.frequency.setValueAtTime(30, t0);
          o.frequency.linearRampToValueAtTime(55, t0 + 1.2);
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = 220;
          const og = ctx.createGain();
          this.env(og, t0, 0.3, 0.4 * vol, 1.6);
          o.connect(f);
          f.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 2);
          return { nodes: [o], dur: 2 };
        });
        break;
      case "explosion":
        S((g) => {
          const src = this.noiseSource(2.5, 0.35);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.setValueAtTime(900, t0);
          f.frequency.exponentialRampToValueAtTime(45, t0 + 2);
          src.connect(f);
          f.connect(g);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.9 * vol, t0 + 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.3);
          src.start(t0);
          src.stop(t0 + 2.4);
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(70, t0);
          o.frequency.exponentialRampToValueAtTime(24, t0 + 1.4);
          const og = ctx.createGain();
          this.env(og, t0, 0.02, 0.9 * vol, 1.5);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 1.7);
          return { nodes: [src, o], dur: 2.4 };
        });
        break;
      case "metal_creak":
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(180 + Math.random() * 120, t0);
          o.frequency.linearRampToValueAtTime(90 + Math.random() * 60, t0 + 1.3);
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = 800;
          f.Q.value = 14;
          const og = ctx.createGain();
          this.env(og, t0, 0.5, 0.12 * vol, 0.9);
          o.connect(f);
          f.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 1.5);
          return { nodes: [o], dur: 1.5 };
        });
        break;
      case "alarm":
        S((g) => {
          for (let i = 0; i < 4; i++) {
            const o = ctx.createOscillator();
            o.type = "square";
            o.frequency.setValueAtTime(660, t0 + i * 0.5);
            o.frequency.setValueAtTime(520, t0 + i * 0.5 + 0.25);
            const og = ctx.createGain();
            this.env(og, t0 + i * 0.5, 0.02, 0.1 * vol, 0.4);
            o.connect(og);
            og.connect(dest);
            o.start(t0 + i * 0.5);
            o.stop(t0 + i * 0.5 + 0.5);
          }
          return { nodes: [], dur: 2.2 };
        });
        break;
      case "spit":
        // بصقة حمضية رطبة — ضجيج مُرشَّح + مذبذب هابط
        S((g) => {
          const src = this.noiseSource(0.25, 1.6);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.setValueAtTime(900, t0);
          f.frequency.exponentialRampToValueAtTime(300, t0 + 0.18);
          f.Q.value = 2.5;
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.008, 0.35 * vol, 0.16);
          src.start(t0);
          src.stop(t0 + 0.25);
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(420, t0);
          o.frequency.exponentialRampToValueAtTime(110, t0 + 0.2);
          const og = ctx.createGain();
          this.env(og, t0, 0.01, 0.28 * vol, 0.18);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.25);
          return { nodes: [src, o], dur: 0.3 };
        });
        break;
      case "acid_hit":
        // أزيز الحمض — ضجيج عالي التردد يخبو 0.4s
        S((g) => {
          const src = this.noiseSource(0.5, 1.8);
          if (!src) return null;
          const f = ctx.createBiquadFilter();
          f.type = "highpass";
          f.frequency.setValueAtTime(2600, t0);
          f.frequency.exponentialRampToValueAtTime(700, t0 + 0.4);
          src.connect(f);
          f.connect(g);
          this.env(g, t0, 0.01, 0.3 * vol, 0.4);
          src.start(t0);
          src.stop(t0 + 0.5);
          return { nodes: [src], dur: 0.5 };
        });
        break;
      case "thud":
        // ارتطام ثقيل — جيب 55Hz + نقرة ضجيج
        S((g) => {
          const o = ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(58, t0);
          o.frequency.exponentialRampToValueAtTime(30, t0 + 0.24);
          const og = ctx.createGain();
          this.env(og, t0, 0.006, 0.8 * vol, 0.24);
          o.connect(og);
          og.connect(dest);
          o.start(t0);
          o.stop(t0 + 0.3);
          const src = this.noiseSource(0.08, 0.8);
          if (src) {
            const f = ctx.createBiquadFilter();
            f.type = "lowpass";
            f.frequency.value = 800;
            const ng = ctx.createGain();
            this.env(ng, t0, 0.002, 0.25 * vol, 0.05);
            src.connect(f);
            f.connect(ng);
            ng.connect(dest);
            src.start(t0);
            src.stop(t0 + 0.1);
          }
          return { nodes: [o], dur: 0.35 };
        });
        break;
      case "pump":
        // مضخة البندقية — نقرتان معدنيتان سريعتان
        S((g) => {
          for (let i = 0; i < 2; i++) {
            const tt = t0 + i * 0.11;
            const o = ctx.createOscillator();
            o.type = "square";
            o.frequency.value = (i === 0 ? 900 : 700) + Math.random() * 250;
            const og = ctx.createGain();
            this.env(og, tt, 0.001, 0.16 * vol, 0.05);
            o.connect(og);
            og.connect(dest);
            o.start(tt);
            o.stop(tt + 0.08);
            const src = this.noiseSource(0.06, 1.4);
            if (src) {
              const f = ctx.createBiquadFilter();
              f.type = "highpass";
              f.frequency.value = 2000;
              const ng = ctx.createGain();
              this.env(ng, tt, 0.001, 0.1 * vol, 0.04);
              src.connect(f);
              f.connect(ng);
              ng.connect(dest);
              src.start(tt);
              src.stop(tt + 0.08);
            }
          }
          return { nodes: [], dur: 0.3 };
        });
        break;
    }
  }

  // ── heartbeat ──
  startHeartbeat() {
    if (this.hbTimer || !this.ctx) return;
    const beat = () => {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime + 0.01;
      [0, 0.18].forEach((off, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(58, t0 + off);
        o.frequency.exponentialRampToValueAtTime(38, t0 + off + 0.1);
        const g = ctx.createGain();
        this.env(g, t0 + off, 0.005, i === 0 ? 0.5 : 0.32, 0.12);
        o.connect(g);
        g.connect(this.master);
        o.start(t0 + off);
        o.stop(t0 + off + 0.2);
      });
    };
    beat();
    this.hbTimer = setInterval(beat, 950);
  }

  stopHeartbeat() {
    if (this.hbTimer) {
      clearInterval(this.hbTimer);
      this.hbTimer = null;
    }
  }

  // ── صفارة مدينة بعيدة (أجواء الشارع) ──
  private scheduleSiren() {
    if (this.sirenTimer) clearTimeout(this.sirenTimer);
    this.sirenTimer = setTimeout(() => {
      this.sirenTimer = null;
      if (this.currentAmbient !== "city") return;
      this.playSiren();
      this.scheduleSiren();
    }, 50000 + Math.random() * 40000);
  }

  private playSiren() {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.1;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(600, t0);
    o.frequency.linearRampToValueAtTime(900, t0 + 3);
    o.frequency.linearRampToValueAtTime(600, t0 + 6);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1100;
    const g = ctx.createGain();
    const peak = 0.05 * this.volumes.master;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 1.5);
    g.gain.setValueAtTime(peak, t0 + 4.5);
    g.gain.linearRampToValueAtTime(0.0001, t0 + 6);
    o.connect(f);
    f.connect(g);
    g.connect(this.ambBus);
    o.start(t0);
    o.stop(t0 + 6.2);
  }

  // ── مروحية الإخلاء (حلقة مستمرة) ──
  setHeli(on: boolean) {
    if (!this.ctx || !this.started) return;
    const ctx = this.ctx;
    if (on && !this.heliNodes) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 2.5);
      g.connect(this.ambBus);
      // ضجيج مُقطَّع بـ LFO — دوار المروحة
      const src = ctx.createBufferSource();
      if (!this.noiseBuf) {
        g.disconnect();
        return;
      }
      src.buffer = this.noiseBuf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const chop = ctx.createGain();
      chop.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.type = "square";
      lfo.frequency.value = 12.5;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.5;
      lfo.connect(lfoG);
      lfoG.connect(chop.gain);
      src.connect(lp);
      lp.connect(chop);
      chop.connect(g);
      // نبضة 18Hz — حفيف الهيكل
      const thump = ctx.createOscillator();
      thump.type = "sine";
      thump.frequency.value = 18;
      const tg = ctx.createGain();
      tg.gain.value = 0.55;
      thump.connect(tg);
      tg.connect(g);
      src.start();
      lfo.start();
      thump.start();
      this.heliNodes = { gain: g, nodes: [src, lfo, thump] };
    } else if (!on && this.heliNodes) {
      const { gain, nodes } = this.heliNodes;
      this.heliNodes = null;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      window.setTimeout(() => {
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch {
            /* noop */
          }
        });
        try {
          gain.disconnect();
        } catch {
          /* noop */
        }
      }, 1500);
    }
  }

  // ── طقطقة نار قريبة (شدة 0..1) ──
  setFire(intensity: number) {
    if (!this.ctx || !this.started) return;
    this.fireLevel = Math.max(0, Math.min(1, intensity));
    if (this.fireLevel > 0.02 && !this.fireTimer) {
      this.fireTimer = setInterval(() => {
        if (this.fireLevel < 0.02 || !this.ctx || !this.noiseBuf) return;
        if (Math.random() > this.fireLevel * 0.9) return;
        const ctx = this.ctx;
        const t0 = ctx.currentTime + 0.01;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.playbackRate.value = 0.7 + Math.random() * 1.6;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 500 + Math.random() * 2200;
        f.Q.value = 1.2;
        const g = ctx.createGain();
        this.env(g, t0, 0.002, (0.05 + Math.random() * 0.09) * this.fireLevel, 0.05 + Math.random() * 0.08);
        src.connect(f);
        f.connect(g);
        g.connect(this.ambBus);
        src.start(t0, Math.random() * 1.5);
        src.stop(t0 + 0.2);
      }, 90);
    } else if (this.fireLevel <= 0.02 && this.fireTimer) {
      clearInterval(this.fireTimer);
      this.fireTimer = null;
    }
  }

  // ── ambient beds ──
  startAmbient(profile: AmbientProfile) {
    if (!this.ctx || !this.started) return;
    if (this.currentAmbient === profile) return;
    this.stopAmbient();
    this.currentAmbient = profile;
    const ctx = this.ctx;

    const mkDrone = (freqs: number[], gainV: number, lfoF: number, type: OscillatorType = "sine") => {
      const g = ctx.createGain();
      g.gain.value = gainV;
      g.connect(this.ambBus);
      const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f * (1 + i * 0.003);
        const og = ctx.createGain();
        og.gain.value = 1 / freqs.length;
        o.connect(og);
        og.connect(g);
        o.start();
        nodes.push(o);
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoF;
      const lg = ctx.createGain();
      lg.gain.value = gainV * 0.4;
      lfo.connect(lg);
      lg.connect(g.gain);
      lfo.start();
      nodes.push(lfo);
      nodes.forEach((n) => this.ambNodes.push({ stop: () => n.stop() }));
      return { nodes, g };
    };

    const mkWind = (gainV: number, cutoff: number, rate: number) => {
      if (!this.noiseBuf) return { nodes: [] as AudioBufferSourceNode[], g: ctx.createGain() };
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      src.playbackRate.value = rate;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.value = gainV;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lg = ctx.createGain();
      lg.gain.value = gainV * 0.55;
      lfo.connect(lg);
      lg.connect(g.gain);
      src.connect(f);
      f.connect(g);
      g.connect(this.ambBus);
      src.start();
      lfo.start();
      ([src, lfo] as (AudioBufferSourceNode | OscillatorNode)[]).forEach((n) =>
        this.ambNodes.push({ stop: () => n.stop() }),
      );
      return { nodes: [src, lfo] as (AudioBufferSourceNode | OscillatorNode)[], g };
    };

    // threat layer (persistent, gain 0)
    const tg = ctx.createGain();
    tg.gain.value = 0;
    tg.connect(this.musicBus);
    [110, 116.54, 155.56].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.33;
      o.connect(og);
      og.connect(tg);
      o.start();
      this.ambNodes.push({ stop: () => o.stop() });
    });
    const pulse = ctx.createOscillator();
    pulse.type = "sine";
    pulse.frequency.value = 2.2;
    const pg = ctx.createGain();
    pg.gain.value = 0.25;
    pulse.connect(pg);
    pg.connect(tg.gain);
    pulse.start();
    this.ambNodes.push({ stop: () => pulse.stop() });
    this.threatGains = [tg];

    const scheduleCreaks = (minGap: number, maxGap: number, sfx: SfxName, vol: number) => {
      const loop = () => {
        this.ambTimer = setTimeout(
          () => {
            if (this.currentAmbient === profile) this.play(sfx, { volume: vol, pan: Math.random() * 1.6 - 0.8 });
            loop();
          },
          minGap + Math.random() * (maxGap - minGap),
        );
      };
      loop();
    };

    switch (profile) {
      case "menu":
        mkDrone([55, 58.27], 0.12, 0.05);
        mkWind(0.1, 300, 0.4);
        scheduleCreaks(5000, 11000, "metal_creak", 0.5);
        break;
      case "city":
        mkDrone([49, 51.9], 0.1, 0.04);
        mkWind(0.16, 420, 0.5);
        mkDrone([98], 0.05, 0.03, "triangle");
        scheduleCreaks(6000, 14000, "metal_creak", 0.7);
        scheduleCreaks(9000, 20000, "growl_far", 1);
        scheduleCreaks(15000, 30000, "thunder", 0.7);
        this.scheduleSiren();
        break;
      case "indoor":
        mkDrone([62, 65.4], 0.09, 0.06);
        mkWind(0.07, 200, 0.35);
        scheduleCreaks(7000, 15000, "metal_creak", 0.8);
        scheduleCreaks(8000, 18000, "growl_far", 0.9);
        break;
      case "lab": {
        mkDrone([60, 120.5], 0.11, 0.08, "square");
        mkWind(0.06, 180, 0.3);
        const beepLoop = () => {
          this.ambTimer = setTimeout(() => {
            if (this.currentAmbient === "lab" && this.ctx) {
              const t0 = this.ctx.currentTime + 0.01;
              const o = this.ctx.createOscillator();
              o.type = "sine";
              o.frequency.value = 1400 + Math.random() * 1200;
              const g = this.ctx.createGain();
              this.env(g, t0, 0.01, 0.05, 0.2);
              o.connect(g);
              g.connect(this.ambBus);
              o.start(t0);
              o.stop(t0 + 0.3);
            }
            beepLoop();
          }, 3000 + Math.random() * 7000);
        };
        beepLoop();
        scheduleCreaks(9000, 18000, "growl_far", 1);
        break;
      }
      case "harbor":
        mkDrone([45], 0.09, 0.03);
        mkWind(0.22, 700, 0.6);
        scheduleCreaks(5000, 10000, "metal_creak", 0.9);
        break;
    }
  }

  setThreat(t: number) {
    if (!this.ctx || this.threatGains.length === 0) return;
    const v = Math.max(0, Math.min(1, t));
    this.threatGains.forEach((g) =>
      g.gain.setTargetAtTime(v * 0.14, this.ctx!.currentTime, 0.4),
    );
  }

  stopAmbient() {
    this.ambNodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* noop */
      }
    });
    this.ambNodes = [];
    this.threatGains = [];
    if (this.ambTimer) {
      clearTimeout(this.ambTimer);
      this.ambTimer = null;
    }
    if (this.sirenTimer) {
      clearTimeout(this.sirenTimer);
      this.sirenTimer = null;
    }
    this.currentAmbient = null;
  }

  // ── pre-generated voice files (/public/audio/voices/{name}.mp3) ──
  private currentVoice: HTMLAudioElement | null = null;

  playVoice(name: string, onEnd?: () => void): boolean {
    const a = new Audio(`/audio/voices/${name}.wav`);
    a.volume = this.volumes.master;
    let ok = true;
    a.onerror = () => {
      ok = false;
      onEnd?.();
    };
    a.onended = () => onEnd?.();
    a.play().catch(() => {
      ok = false;
      onEnd?.();
    });
    this.currentVoice = a;
    return ok;
  }

  stopVoice() {
    if (this.currentVoice) {
      this.currentVoice.pause();
      this.currentVoice = null;
    }
  }
}

export const audio = new AudioEngine();
