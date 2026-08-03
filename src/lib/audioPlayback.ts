/**
 * Playback of the translated English audio (24 kHz mono PCM).
 *
 * Useful for interpreter headsets or a separate audio feed. Keep it OFF when
 * the laptop's own speakers are in the room: the mic would pick the English
 * back up and the model would translate its own output.
 */
import { OUTPUT_SAMPLE_RATE } from '../config';
import { base64ToBytes, pcm16ToFloat32 } from './base64';

export class AudioPlayback {
  private context: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private gain: GainNode | null = null;
  private ready: Promise<void> | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private outputDeviceId: string | null = null;

  private volume = 1;

  /** Idempotent: safe to call on every enqueue. */
  private async init(): Promise<void> {
    if (this.ready) return this.ready;

    this.ready = (async () => {
      const context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      if (context.state === 'suspended') await context.resume();

      await context.audioWorklet.addModule('/worklets/pcm-player.js');

      const node = new AudioWorkletNode(context, 'pcm-player', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      const gain = context.createGain();
      gain.gain.value = this.volume;

      const destination = context.createMediaStreamDestination();
      node.connect(gain);
      gain.connect(destination);

      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElement.srcObject = destination.stream;
      audioElement.play().catch(() => {
        // Autoplay may be restricted until user interaction, but audio will still
        // play once the user interacts or the page is active.
      });

      this.context = context;
      this.node = node;
      this.gain = gain;
      this.audioElement = audioElement;

      if (this.outputDeviceId) {
        await this.applyOutputDevice();
      }
    })();

    return this.ready;
  }

  /** Queue one base64 PCM16 chunk straight from the Live API. */
  async enqueue(base64Pcm: string): Promise<void> {
    await this.init();
    const samples = pcm16ToFloat32(base64ToBytes(base64Pcm));
    this.node?.port.postMessage(samples, [samples.buffer]);
  }

  async setOutputDevice(deviceId: string | null): Promise<void> {
    this.outputDeviceId = deviceId;
    if (!this.audioElement) return;
    await this.applyOutputDevice();
  }

  private async applyOutputDevice(): Promise<void> {
    if (!this.audioElement || !this.outputDeviceId) return;
    if (typeof this.audioElement.setSinkId === 'function') {
      try {
        await this.audioElement.setSinkId(this.outputDeviceId);
      } catch {
        // Browsers may reject if the device is unavailable or not allowed.
      }
    }
  }

  /** Drop everything queued — call this on an `interrupted` signal. */
  clear(): void {
    this.node?.port.postMessage('clear');
  }

  setVolume(value: number): void {
    this.volume = value;
    if (this.gain) this.gain.gain.value = value;
  }

  async close(): Promise<void> {
    this.clear();
    this.node?.disconnect();
    this.gain?.disconnect();
    await this.context?.close();
    this.context = null;
    this.node = null;
    this.gain = null;
    this.ready = null;
  }
}
