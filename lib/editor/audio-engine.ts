/**
 * 音频引擎
 * Web Audio API 混音器，管理视频音轨和背景音乐
 */

import type { AudioTrack, TimelineClip, EditorTimeline } from "./types";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // 视频音源
  private videoSources: Map<string, MediaElementAudioSourceNode> = new Map();
  private videoGains: Map<string, GainNode> = new Map();

  // BGM 音源
  private bgmBuffers: Map<string, AudioBuffer> = new Map();
  private bgmSources: Map<string, AudioBufferSourceNode> = new Map();
  private bgmGains: Map<string, GainNode> = new Map();

  /**
   * 初始化 AudioContext（需在用户交互后调用）
   */
  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);
  }

  /**
   * 连接视频元素到音频图
   */
  connectVideo(clipId: string, video: HTMLVideoElement, volume: number = 1): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.videoSources.has(clipId)) return;

    try {
      const source = this.ctx.createMediaElementSource(video);
      const gain = this.ctx.createGain();
      gain.gain.value = volume;

      source.connect(gain);
      gain.connect(this.masterGain);

      this.videoSources.set(clipId, source);
      this.videoGains.set(clipId, gain);
    } catch {
      // 视频可能已经连接过
    }
  }

  /**
   * 设置视频音量
   */
  setVideoVolume(clipId: string, volume: number): void {
    const gain = this.videoGains.get(clipId);
    if (gain) {
      gain.gain.value = volume;
    }
  }

  /**
   * 预加载 BGM
   */
  async loadBGM(track: AudioTrack): Promise<void> {
    if (!this.ctx) return;
    if (this.bgmBuffers.has(track.id)) return;

    try {
      const response = await fetch(track.url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.bgmBuffers.set(track.id, audioBuffer);
    } catch (e) {
      console.error("加载 BGM 失败:", e);
    }
  }

  /**
   * 播放 BGM
   * @param track BGM 轨道配置
   * @param currentTime 当前播放位置（秒）
   */
  playBGM(track: AudioTrack, currentTime: number): void {
    if (!this.ctx || !this.masterGain) return;

    // 停止已有的
    this.stopBGM(track.id);

    const buffer = this.bgmBuffers.get(track.id);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = track.loop;

    const gain = this.ctx.createGain();
    gain.gain.value = track.volume;

    // 淡入
    if (track.fadeIn > 0) {
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(track.volume, this.ctx.currentTime + track.fadeIn);
    }

    source.connect(gain);
    gain.connect(this.masterGain);

    // 计算偏移
    const offset = Math.max(0, currentTime - track.startTime);
    source.start(0, offset);

    this.bgmSources.set(track.id, source);
    this.bgmGains.set(track.id, gain);
  }

  /**
   * 停止 BGM
   */
  stopBGM(trackId: string): void {
    const source = this.bgmSources.get(trackId);
    if (source) {
      try {
        source.stop();
      } catch {
        // 已停止
      }
      source.disconnect();
      this.bgmSources.delete(trackId);
    }

    const gain = this.bgmGains.get(trackId);
    if (gain) {
      gain.disconnect();
      this.bgmGains.delete(trackId);
    }
  }

  /**
   * 停止所有音频
   */
  stopAll(): void {
    for (const [id] of this.bgmSources) {
      this.stopBGM(id);
    }
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.stopAll();

    for (const [id, source] of this.videoSources) {
      source.disconnect();
      this.videoSources.delete(id);
    }
    for (const [id, gain] of this.videoGains) {
      gain.disconnect();
      this.videoGains.delete(id);
    }

    this.bgmBuffers.clear();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
