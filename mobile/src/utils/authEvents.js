const listeners = new Set();

export const subscribeAuthExpired = (listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const emitAuthExpired = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Auth expired listener failed:', error);
    }
  });
};
