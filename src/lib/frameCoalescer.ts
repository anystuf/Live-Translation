export function createFrameCoalescer<T>(commit: (value: T) => void) {
  let pending: T | null = null;
  let frameId: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    frameId = null;
    if (pending !== null) {
      const value = pending;
      pending = null;
      commit(value);
    }
  };

  return {
    push(value: T) {
      pending = value;
      if (frameId !== null) return;
      frameId = setTimeout(flush, 0);
    },
    dispose() {
      if (frameId !== null) {
        clearTimeout(frameId);
        frameId = null;
      }
      pending = null;
    },
  };
}
