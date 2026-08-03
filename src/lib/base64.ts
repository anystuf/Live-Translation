/**
 * Base64 helpers for the Live API audio path.
 *
 * The wire format carries PCM as base64 strings in both directions, and these
 * run on every 100 ms chunk, so they avoid per-byte string concatenation.
 */

/** Encode raw bytes to base64 without blowing the argument limit on large buffers. */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Decode base64 to raw bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert 16-bit little-endian PCM bytes to the Float32 samples the Web Audio
 * API expects, normalised to [-1, 1).
 */
export function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  // Copy into an aligned buffer: `bytes` may be a view at an odd byte offset.
  const aligned = new Uint8Array(bytes.length - (bytes.length % 2));
  aligned.set(bytes.subarray(0, aligned.length));

  const view = new DataView(aligned.buffer);
  const out = new Float32Array(aligned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getInt16(i * 2, /* littleEndian */ true) / 32768;
  }
  return out;
}
