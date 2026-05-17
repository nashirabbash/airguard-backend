const store = new Map<string, string[]>();

export const logStore = {
  set(deviceId: string, entries: string[]) {
    store.set(deviceId, entries);
  },

  get(deviceId: string): string[] {
    return store.get(deviceId) ?? [];
  },

  has(deviceId: string): boolean {
    return store.has(deviceId);
  },
};
