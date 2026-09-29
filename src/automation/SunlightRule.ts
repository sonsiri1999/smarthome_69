import { SetCurtainCommand } from '../commands/SetCurtainCommand';
import { TurnOffCommand } from '../commands/TurnOffCommand';
import { TurnOnCommand } from '../commands/TurnOnCommand';
import type { SmartHome } from '../core/SmartHome';
import { Curtain } from '../devices/Curtain';
import { FenceLight } from '../devices/FenceLight';
import type { HumiditySensor } from '../sensors/HumiditySensor';
import type { Sensor, SensorObserver } from '../sensors/Sensor';
import { ruleSource, type AutomationRule } from './AutomationRule';

export type DayPeriod = 'day' | 'night';

/**
 * UC2: no sunlight -> fence lights on; sunlight -> fence lights off.
 * UC3: sunlight -> curtains down; no sunlight -> curtains up.
 * While it rains, curtains stay down and fence lights stay on (see RainRule).
 */
export class SunlightRule implements AutomationRule, SensorObserver<number> {
  static readonly DARK_BELOW = 30;
  static readonly BRIGHT_ABOVE = 40;
  readonly name = 'SunlightRule';
  private current: DayPeriod | null = null;

  constructor(
    private readonly home: SmartHome,
    private readonly humidity: HumiditySensor,
  ) {}

  get period(): DayPeriod | null {
    return this.current;
  }

  onSensorChange(_sensor: Sensor<number>, sunlight: number): void {
    const next = this.periodFor(sunlight);
    if (next === this.current) return;
    this.current = next;
    this.home.log(
      ruleSource(this),
      next === 'night'
        ? `แสงแดดหมด (${sunlight}%) → เข้าโหมดกลางคืน`
        : `มีแสงแดด (${sunlight}%) → เข้าโหมดกลางวัน`,
    );
    this.apply();
  }

  /** Puts the devices in the state the current period (and weather) calls for. */
  apply(): void {
    if (!this.current) return;
    const night = this.current === 'night';
    const raining = this.humidity.isRaining;
    const source = ruleSource(this);

    for (const light of this.home.devicesOf(FenceLight)) {
      this.home.run(night || raining ? new TurnOnCommand(light) : new TurnOffCommand(light), source);
    }
    for (const curtain of this.home.devicesOf(Curtain)) {
      this.home.run(new SetCurtainCommand(curtain, !night || raining), source);
    }
  }

  /** Between the two thresholds the previous period is kept, so the lights don't flicker. */
  private periodFor(sunlight: number): DayPeriod {
    if (sunlight < SunlightRule.DARK_BELOW) return 'night';
    if (sunlight > SunlightRule.BRIGHT_ABOVE) return 'day';
    return this.current ?? 'day';
  }
}
