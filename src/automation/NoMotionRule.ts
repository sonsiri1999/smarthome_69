import { TurnOffCommand } from '../commands/TurnOffCommand';
import type { SmartHome } from '../core/SmartHome';
import { AirConditioner } from '../devices/AirConditioner';
import { Light } from '../devices/Light';
import { TV } from '../devices/TV';
import { occupiedRooms, type RoomMotionSensors } from '../sensors/MotionSensor';
import type { SensorObserver } from '../sensors/Sensor';
import { ruleSource, type AutomationRule } from './AutomationRule';

/**
 * UC6: nobody has been detected in any room for a while
 * -> turn off lights, TV and air conditioners (the fridge keeps running).
 */
export class NoMotionRule implements AutomationRule, SensorObserver<boolean> {
  static readonly DEFAULT_TIMEOUT_MS = 10_000;
  readonly name = 'NoMotionRule';
  timeoutMs = NoMotionRule.DEFAULT_TIMEOUT_MS;
  private idleMs = 0;
  private triggered = false;

  constructor(
    private readonly home: SmartHome,
    private readonly motion: RoomMotionSensors,
  ) {}

  private get someoneHome(): boolean {
    return occupiedRooms(this.motion).length > 0;
  }

  /** Time left before the shutdown, or null when the countdown isn't running. */
  get remainingMs(): number | null {
    if (this.someoneHome || this.triggered) return null;
    return Math.max(0, this.timeoutMs - this.idleMs);
  }

  onSensorChange(): void {
    this.idleMs = 0;
    if (this.someoneHome) this.triggered = false;
  }

  update(dtMs: number): void {
    if (this.someoneHome || this.triggered) return;
    this.idleMs += dtMs;
    if (this.idleMs < this.timeoutMs) return;

    this.triggered = true;
    const source = ruleSource(this);
    this.home.log(
      source,
      `ไม่พบคนในบ้าน ${Math.round(this.timeoutMs / 1000)} วินาที → ปิดไฟ ทีวี และแอร์`,
    );
    const devices = [
      ...this.home.devicesOf(Light),
      ...this.home.devicesOf(TV),
      ...this.home.devicesOf(AirConditioner),
    ];
    for (const device of devices) this.home.run(new TurnOffCommand(device), source);
  }
}
