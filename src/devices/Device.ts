export type Zone = 'living' | 'kitchen' | 'bedroom' | 'outdoor';
/** The zones inside the house. */
export type Room = Exclude<Zone, 'outdoor'>;

export const ROOM_LABELS: Record<Room, string> = {
  living: 'ห้องนั่งเล่น',
  kitchen: 'ห้องครัว',
  bedroom: 'ห้องนอน',
};
export const ROOM_ZONES = Object.keys(ROOM_LABELS) as Room[];
export type DeviceType = 'light' | 'fenceLight' | 'tv' | 'fridge' | 'aircon' | 'curtain' | 'gate';

/** Base class of every device in the house. */
export abstract class Device {
  protected on = false;
  abstract readonly type: DeviceType;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly zone: Zone,
  ) {}

  get isOn(): boolean {
    return this.on;
  }

  turnOn(): void {
    this.on = true;
  }

  turnOff(): void {
    this.on = false;
  }

  /** Advance time-based behaviour such as animations and timers. */
  update(_dtMs: number): void {}

  get statusText(): string {
    return this.on ? 'เปิด' : 'ปิด';
  }
}
