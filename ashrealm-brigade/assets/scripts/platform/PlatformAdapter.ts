export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlatformAdapter {
  readonly storage: KeyValueStorage;
  now(): number;
}

export class WebPlatformAdapter implements PlatformAdapter {
  public readonly storage: KeyValueStorage = globalThis.localStorage;

  public now(): number {
    return Date.now();
  }
}
