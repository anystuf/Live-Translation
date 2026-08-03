/**
 * Microphone -> 16 kHz mono PCM16 chunks.
 *
 * The Live API requires raw little-endian 16-bit PCM at 16 kHz, mono, and the
 * Live Translate guide gives 100 ms as the optimal chunk size.
 *
 * The AudioContext is created with `sampleRate: 16000`, so in practice the
 * browser has already resampled for us and `sampleRate` here is 16000. The
 * linear resampler below is a safety net for browsers that ignore the hint.
 */
class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetRate = opts.targetSampleRate || 16000;
    this.chunkSamples = opts.chunkSamples || 1600;

    // Ratio of input samples consumed per output sample.
    this.ratio = sampleRate / this.targetRate;

    this.buffer = new Float32Array(this.chunkSamples);
    this.filled = 0;

    // Fractional read position into the incoming block, carried across blocks.
    this.readPos = 0;
  }

  /** Push one resampled sample, flushing a chunk to the main thread when full. */
  pushSample(sample) {
    this.buffer[this.filled++] = sample;
    if (this.filled === this.chunkSamples) {
      const pcm = new Int16Array(this.chunkSamples);
      for (let i = 0; i < this.chunkSamples; i++) {
        // Clamp before scaling so loud input clips instead of wrapping around.
        const s = Math.max(-1, Math.min(1, this.buffer[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm, [pcm.buffer]);
      this.filled = 0;
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    if (this.ratio === 1) {
      for (let i = 0; i < channel.length; i++) this.pushSample(channel[i]);
      return true;
    }

    // Linear interpolation resample. readPos carries the fractional remainder
    // between blocks so we do not drift or click at block boundaries.
    let pos = this.readPos;
    while (pos < channel.length) {
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = channel[idx];
      const b = idx + 1 < channel.length ? channel[idx + 1] : a;
      this.pushSample(a + (b - a) * frac);
      pos += this.ratio;
    }
    this.readPos = pos - channel.length;

    return true;
  }
}

registerProcessor('pcm-recorder', PcmRecorderProcessor);
