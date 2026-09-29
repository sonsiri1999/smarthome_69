export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

/** Mock "database" of licence plates allowed through the gate. */
export class PlateRepository {
  static readonly STORAGE_KEY = 'pixel-smart-home.allowed-plates';
  static readonly DEFAULT_PLATES = ['กข 1234', '1กก 9999'];
  private plates: string[];

  constructor(private readonly store: KeyValueStore = new MemoryStore()) {
    this.plates = this.load();
  }

  /** Plates match regardless of spacing and letter case. */
  static normalize(plate: string): string {
    return plate.replace(/\s+/g, '').toUpperCase();
  }

  list(): readonly string[] {
    return this.plates;
  }

  isAllowed(plate: string): boolean {
    const key = PlateRepository.normalize(plate);
    return this.plates.some((p) => PlateRepository.normalize(p) === key);
  }

  add(plate: string): boolean {
    const trimmed = plate.trim().replace(/\s+/g, ' ');
    if (!trimmed || this.isAllowed(trimmed)) return false;
    this.plates.push(trimmed);
    this.save();
    return true;
  }

  remove(plate: string): void {
    const key = PlateRepository.normalize(plate);
    this.plates = this.plates.filter((p) => PlateRepository.normalize(p) !== key);
    this.save();
  }

  private load(): string[] {
    try {
      const raw = this.store.getItem(PlateRepository.STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) return parsed;
    } catch {
      // corrupted or unavailable storage: fall back to the defaults
    }
    return [...PlateRepository.DEFAULT_PLATES];
  }

  private save(): void {
    try {
      this.store.setItem(PlateRepository.STORAGE_KEY, JSON.stringify(this.plates));
    } catch {
      // storage may be blocked (private mode); keep working in memory
    }
  }
}
