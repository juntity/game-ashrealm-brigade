export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlatformAdapter {
  readonly storage: KeyValueStorage;
  now(): number;
  onHide(callback: () => void): () => void;
  onShow(callback: () => void): () => void;
}

export class WebPlatformAdapter implements PlatformAdapter {
  public readonly storage: KeyValueStorage = globalThis.localStorage;

  public now(): number {
    return Date.now();
  }

  public onHide(callback: () => void): () => void {
    const listener = (): void => {
      if (globalThis.document.visibilityState === 'hidden') {
        callback();
      }
    };
    globalThis.document.addEventListener('visibilitychange', listener);
    return () => globalThis.document.removeEventListener('visibilitychange', listener);
  }

  public onShow(callback: () => void): () => void {
    const listener = (): void => {
      if (globalThis.document.visibilityState === 'visible') {
        callback();
      }
    };
    globalThis.document.addEventListener('visibilitychange', listener);
    return () => globalThis.document.removeEventListener('visibilitychange', listener);
  }
}
