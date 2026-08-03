/**
 * Gap-free playback of the Live API's 24 kHz mono PCM output.
 *
 * Chunks arrive faster or slower than realtime, so they are queued and drained
 * one render quantum at a time. Scheduling each chunk as its own AudioBuffer
 * would produce audible seams between them.
 *
 * The owning AudioContext must be created with `sampleRate: 24000` so no
 * resampling is needed here.
 */
class PcmPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    /** Queue of Float32Array chunks waiting to be played. */
    this.queue = [];
    /** Read offset into queue[0]. */
    this.offset = 0;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data === 'clear') {
        // Interruption: drop everything still queued, immediately.
        this.queue = [];
        this.offset = 0;
        return;
      }
      this.queue.push(data);
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
