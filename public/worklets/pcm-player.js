/**
 * Gap-free playback of the Live API's 24 kHz mono PCM output.
 *
 * Chunks arrive faster or slower than realtime, so they are queued and drained
 * one render quantum at a time. Scheduling each chunk as its own AudioBuffer
 * would produce audible seams between them.
 *
 * The main thread resamples the model's 24 kHz output to the AudioContext's
 * actual rate before queueing it. This matters on phones, which often force
 * the context to 48 kHz even when 24 kHz was requested.
 */
class PcmPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    /** Queue of Float32Array chunks waiting to be played. */
    this.queue = [];
    /** Read offset into queue[0]. */
    this.offset = 0;
    this.queuedSamples = 0;
    this.maxQueuedSamples = sampleRate * 3;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data === 'clear') {
        // Interruption: drop everything still queued, immediately.
        this.queue = [];
        this.offset = 0;
        this.queuedSamples = 0;
        return;
      }
      if (!(data instanceof Float32Array) || data.length === 0) return;
      this.queue.push(data);
      this.queuedSamples += data.length;

      // Never replay a long stale backlog after a mobile network stall.
      while (this.queuedSamples > this.maxQueuedSamples && this.queue.length > 1) {
        const dropped = this.queue.shift();
        this.queuedSamples -= dropped.length;
        this.offset = 0;
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    const channel = output[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      if (this.queue.length === 0) {
        channel[i] = 0; // Underrun — emit silence rather than stutter.
        continue;
      }
      const current = this.queue[0];
      channel[i] = current[this.offset++];
      if (this.offset >= current.length) {
        this.queue.shift();
        this.queuedSamples -= current.length;
        this.offset = 0;
      }
    }

    // Mono source, but copy to any extra output channels so it is not silent
    // on a stereo output device.
    for (let c = 1; c < output.length; c++) output[c].set(channel);

    return true;
  }
}

registerProcessor('pcm-player', PcmPlayerProcessor);
