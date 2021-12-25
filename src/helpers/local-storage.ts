import { LightStructure } from '../models/light-structure';

interface StoredValues {
  lastStructure: LightStructure;
}

export class LocalStorageHelper {
  private storage = window.localStorage;

  public put<TKey extends keyof StoredValues>(key: TKey, value: StoredValues[TKey]) {
    this.storage.setItem(
      key,
      JSON.stringify({
        value: value,
      })
    );
  }

  public get<TKey extends keyof StoredValues>(key: TKey): StoredValues[TKey] | null {
    const stored = this.storage.getItem(key);

    if (stored) {
      return JSON.parse(stored).value;
    }

    return null;
  }
}
