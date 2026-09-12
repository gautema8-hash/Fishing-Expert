/**
 * 音效系统
 * Web Audio API 程序化生成音效 + 背景音乐，支持独立开关
 */
import { Events } from '../core/EventBus.js';

export class AudioSystem {
    constructor(eventBus, saveData) {
        this.eventBus = eventBus;
        this.saveData = saveData;

        this.ctx = null;
        this.masterGain = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.bgmSource = null;
        this._initialized = false;
        this._bgmPlaying = false;

        this.bgmVolume = saveData.settings.bgmVolume;
        this.sfxVolume = saveData.settings.sfxVolume;
        this.bgmMuted = saveData.settings.bgmMuted;
        this.sfxMuted = saveData.settings.sfxMuted;
    }

    /**
     * 初始化音频上下文（必须在用户交互后调用）
     */
    init() {
        if (this._initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.connect(this.masterGain);
            this.bgmGain.gain.value = this.bgmMuted ? 0 : this.bgmVolume;

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxMuted ? 0 : this.sfxVolume;

            this._initialized = true;
        } catch (e) {
            console.warn('[AudioSystem] Web Audio not supported:', e);
        }
    }

    /**
     * 播放音效
     */
    play(name) {
        if (!this._initialized || this.sfxMuted) return;
        switch (name) {
            case 'fire': this._playFire(); break;
            case 'hit': this._playHit(); break;
            case 'kill': this._playKill(); break;
            case 'crit': this._playCrit(); break;
            case 'boss': this._playBoss(); break;
            case 'coin': this._playCoin(); break;
            case 'button': this._playButton(); break;
            case 'item': this._playItem(); break;
            case 'levelup': this._playLevelUp(); break;
            case 'freeze': this._playFreeze(); break;
            case 'lightning': this._playLightning(); break;
            case 'upgrade': this._playUpgrade(); break;
            case 'pet': this._playPet(); break;
            case 'skin': this._playSkin(); break;
        }
    }

    _playFire() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    _playHit() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    _playKill() {
        const t = this.ctx.currentTime;
        // 水花声
        const noise = this.ctx.createBufferSource();
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
        }
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.15;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);

        // 金币声
        setTimeout(() => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
            osc.frequency.setValueAtTime(1600, this.ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        }, 50);
    }

    _playCrit() {
        const t = this.ctx.currentTime;
        // 雷鸣
        const noise = this.ctx.createBufferSource();
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
        }
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);

        // 龙啸
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
        oscGain.gain.setValueAtTime(0.2, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.4);
    }

    _playBoss() {
        const t = this.ctx.currentTime;
        // 低沉龙吟
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60 + i * 20, t + i * 0.1);
            osc.frequency.linearRampToValueAtTime(40 + i * 15, t + 0.8 + i * 0.1);
            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.1 + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8 + i * 0.1);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.1);
            osc.stop(t + 1 + i * 0.1);
        }
    }

    _playCoin() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, t);
        osc.frequency.setValueAtTime(1400, t + 0.03);
        osc.frequency.setValueAtTime(1800, t + 0.06);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    _playButton() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.setValueAtTime(800, t + 0.03);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    _playItem() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    _playLevelUp() {
        const t = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.2);
        });
    }

    /**
     * 冰冻技能音效：高频下滑+冷感
     */
    _playFreeze() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.5);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.5);
        // 冰晶噪声
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.05;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);
    }

    /**
     * 闪电技能音效：爆裂噪声+低频冲击
     */
    _playLightning() {
        const t = this.ctx.currentTime;
        // 低频冲击
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
        // 闪电噪声
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.12;
        noise.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);
    }

    /**
     * 升级音效：上升音阶
     */
    _playUpgrade() {
        const t = this.ctx.currentTime;
        const notes = [392, 523, 659, 784];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.1, t + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.15);
        });
    }

    /**
     * 宠物音效：清脆叮当
     */
    _playPet() {
        const t = this.ctx.currentTime;
        [880, 1100, 1320].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.08, t + i * 0.06 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + i * 0.06);
            osc.stop(t + i * 0.06 + 0.2);
        });
    }

    /**
     * 皮肤切换音效：流光扫过
     */
    _playSkin() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.4);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.4);
    }

    /**
     * 播放背景音乐（程序化生成氛围音乐）
     */
    playBGM() {
        if (!this._initialized || this._bgmPlaying || this.bgmMuted) return;
        this._bgmPlaying = true;
        this._startBGMLoop();
    }

    _startBGMLoop() {
        if (!this._bgmPlaying) return;
        const t = this.ctx.currentTime;

        // 深海氛围：低频 Drone + 随机音符
        const drone = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        drone.type = 'sine';
        drone.frequency.value = 55;
        droneGain.gain.value = 0.05;
        drone.connect(droneGain);
        droneGain.connect(this.bgmGain);
        drone.start(t);
        drone.stop(t + 4);

        // 随机国风音符
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (!this._bgmPlaying) return;
                const note = scale[Math.floor(Math.random() * scale.length)];
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = note;
                gain.gain.setValueAtTime(0, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);
                osc.connect(gain);
                gain.connect(this.bgmGain);
                osc.start();
                osc.stop(this.ctx.currentTime + 2);
            }, i * 1200 + Math.random() * 500);
        }

        // 循环
        setTimeout(() => this._startBGMLoop(), 4000);
    }

    stopBGM() {
        this._bgmPlaying = false;
    }

    toggleBGM() {
        this.bgmMuted = !this.bgmMuted;
        this.saveData.settings.bgmMuted = this.bgmMuted;
        if (this.bgmGain) {
            this.bgmGain.gain.value = this.bgmMuted ? 0 : this.bgmVolume;
        }
        if (!this.bgmMuted) this.playBGM();
        else this.stopBGM();
        this.eventBus.emit(Events.BGM_TOGGLE, !this.bgmMuted);
    }

    toggleSFX() {
        this.sfxMuted = !this.sfxMuted;
        this.saveData.settings.sfxMuted = this.sfxMuted;
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxMuted ? 0 : this.sfxVolume;
        }
        this.eventBus.emit(Events.SFX_TOGGLE, !this.sfxMuted);
    }

    setBGMVolume(value) {
        this.bgmVolume = value;
        this.saveData.settings.bgmVolume = value;
        if (this.bgmGain && !this.bgmMuted) {
            this.bgmGain.gain.value = value;
        }
    }

    setSFXVolume(value) {
        this.sfxVolume = value;
        this.saveData.settings.sfxVolume = value;
        if (this.sfxGain && !this.sfxMuted) {
            this.sfxGain.gain.value = value;
        }
    }
}
