/**
 * Microphone capture pipeline.
 *
 * getUserMedia -> AudioContext(16 kHz) -> pcm-recorder worklet -> PCM16 chunks.
 *
 * Requesting the AudioContext at the Live API's required 16 kHz lets the
 * browser do the resampling in native code; the worklet still has a fallback.
 */
import { CHUNK_SAMPLES, INPUT_SAMPLE_RATE } from '../config';

export interface CaptureHandle {
  /** Device label of the mic actually in use, for the operator's benefit. */
  deviceLabel: string;
  /** Live input level in [0, 1], sampled by the caller for the VU meter. */
  getLevel(): number;
  stop(): Promise<void>;
}

export interface CaptureOptions {
  /** Called with each 100 ms chunk of 16 kHz mono PCM16. */
  onChunk(pcm16: Int16Array): void;
  /** Optional specific input device. */
  deviceId?: string;
  /**
   * Browser noise suppression / echo cancellation. Off by default: they are
   * tuned for phone calls and can chew up a lectern mic's speech, which costs
   * fidelity. Turn on only if the room has bad feedback.
   */
  processing?: boolean;
}

export async function startCapture(options: CaptureOptions): Promise<CaptureHandle> {
  const { onChunk, deviceId, processing = false } = options;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      channelCount: 1,
      echoCancellation: processing,
      noiseSuppression: processing,
      autoGainControl: processing,
      sampleRate: INPUT_SAMPLE_RATE,
    },
    video: false,
  });

  const context = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
  // Autoplay policy can leave a fresh context suspended.
  if (context.state === 'suspended') await context.resume();

  await context.audioWorklet.addModule('/worklets/pcm-recorder.js');

  const source = context.createMediaStreamSource(stream);
  const recorder = new AudioWorkletNode(context, 'pcm-recorder', {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    processorOptions: {
      targetSampleRate: INPUT_SAMPLE_RATE,
      chunkSamples: CHUNK_SAMPLES,
    },
  });

  let level = 0;
  recorder.port.onmessage = (event: MessageEvent<Int16Array>) => {
    const pcm = event.data;

    // Peak level for the VU meter — cheap enough at 100 ms granularity and it
    // is the only way an operator can tell a dead mic from a silent room.
    let peak = 0;
    for (let i = 0; i < pcm.length; i += 4) {
      const abs = Math.abs(pcm[i]);
      if (abs > peak) peak = abs;
    }
    // Decay slowly so the meter is readable rather than flickering.
    level = Math.max(peak / 32768, level * 0.8);

    onChunk(pcm);
  };

  source.connect(recorder);

  const track = stream.getAudioTracks()[0];

  return {
    deviceLabel: track?.label || 'Default microphone',
    getLevel: () => level,
    async stop() {
      recorder.port.onmessage = null;
      source.disconnect();
      recorder.disconnect();
      for (const t of stream.getTracks()) t.stop();
      await context.close();
    },
  };
}

/** Input devices, for the operator's device picker. Labels need mic permission. */
export async function listInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput');
}

/** Output devices, for selecting where translated audio should play. */
export async function listOutputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audiooutput');
}
