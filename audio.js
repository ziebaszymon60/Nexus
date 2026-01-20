/**
 * 🔊 PROCEDURAL AUDIO SYSTEM
 * Synthesizes sound effects in real-time using Web Audio API.
 * No external mp3 files required!
 */

const AudioSys = {
    ctx: null,
    masterGain: null,

    // Nodes
    engine: {
        osc: null,
        noise: null,
        filter: null,
        gain: null
    },
    wind: {
        noise: null,
        filter: null,
        gain: null
    },

    enabled: false,

    init: function () {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5; // Master volume
            this.masterGain.connect(this.ctx.destination);

            this.enabled = true;
            console.log("Audio System Initialized 🔊");
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    },

    resume: function () {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    createNoiseBuffer: function () {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    },

    startEngine: function () {
        if (!this.ctx) this.init();
        this.resume();

        if (this.engine.gain) return; // Already running

        // --- RUMBLE (Brown/Red Noise ish) ---
        // We use a low-pass filtered noise for the deep rumble
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this.createNoiseBuffer();
        noiseSrc.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 80;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noiseSrc.start();

        // --- WHINE (High pitched turbine) ---
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 50;
        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0;

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start();

        this.engine = {
            noise: noiseSrc,
            filter: filter,
            gain: gain,
            osc: osc,
            oscGain: oscGain
        };

        // --- WIND (Ambience) ---
        const windSrc = this.ctx.createBufferSource();
        windSrc.buffer = this.createNoiseBuffer();
        windSrc.loop = true;

        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 400;
        windFilter.Q.value = 1;

        const windGain = this.ctx.createGain();
        windGain.gain.value = 0;

        windSrc.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.masterGain);

        windSrc.start();

        this.wind = {
            noise: windSrc,
            filter: windFilter,
            gain: windGain
        };
    },

    update: function (thrustPct, speed, altitude) {
        if (!this.enabled || !this.engine.gain) return;

        // Throttle Input (0.0 to 1.0)
        // Smooth transitions
        const now = this.ctx.currentTime;

        // ENGINE RUMBLE
        // Volume rises with thrust
        this.engine.gain.gain.setTargetAtTime(thrustPct * 0.8, now, 0.1);

        // Rumble frequency increases slightly with thrust (more power)
        this.engine.filter.frequency.setTargetAtTime(60 + thrustPct * 100, now, 0.1);

        // ENGINE WHINE
        // Pitch rises dramatically with thrust
        this.engine.osc.frequency.setTargetAtTime(50 + thrustPct * 200, now, 0.1);
        // Volume usually lower than rumble
        this.engine.oscGain.gain.setTargetAtTime(thrustPct * 0.1, now, 0.1);

        // ATMOSPHERIC WIND
        // Dependent on Speed AND Atmosphere density
        // Atmosphere fades out > 50km
        let density = Math.max(0, 1 - (altitude / 50000));
        let windVol = Math.min((Math.abs(speed) / 1000) * density, 1.0); // Cap at max speed approx

        this.wind.gain.gain.setTargetAtTime(windVol * 0.4, now, 0.5);
        this.wind.filter.frequency.setTargetAtTime(300 + windVol * 500, now, 0.2);
    },

    stop: function () {
        if (this.engine.gain) {
            const now = this.ctx.currentTime;
            this.engine.gain.gain.linearRampToValueAtTime(0, now + 0.5);
            this.engine.oscGain.gain.linearRampToValueAtTime(0, now + 0.5);
            this.wind.gain.gain.linearRampToValueAtTime(0, now + 2.0);

            setTimeout(() => {
                // Stop nodes if needed, or just let them mute
                // For now keeping them allocated for simplicity of restart
            }, 2000);
        }
    }
};
