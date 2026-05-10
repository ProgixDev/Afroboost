export const mockDelay = (ms = 800 + Math.random() * 600) =>
  new Promise<void>((res) => setTimeout(res, ms));

export const mockMutation = async <T>(data: T, opts?: { failRate?: number; ms?: number }): Promise<T> => {
  await mockDelay(opts?.ms);
  if (opts?.failRate && Math.random() < opts.failRate) {
    throw new Error('Mock error');
  }
  return data;
};

export const mockQuery = async <T>(data: T, ms?: number): Promise<T> => {
  await mockDelay(ms);
  return data;
};
