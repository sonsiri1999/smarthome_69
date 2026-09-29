import { SetCurtainCommand } from '../commands/SetCurtainCommand';
import { TurnOnCommand } from '../commands/TurnOnCommand';
import type { SmartHome } from '../core/SmartHome';
import { Curtain } from '../devices/Curtain';
import { FenceLight } from '../devices/FenceLight';
import type { HumiditySensor } from '../sensors/HumiditySensor';
import type { SensorObserver } from '../sensors/Sensor';
import { ruleSource, type AutomationRule } from './AutomationRule';
import type { SunlightRule } from './SunlightRule';

/**
 * UC4: when it starts raining, lower the curtains, turn on the fence lights
 * and remind the user to bring in the laundry. When it stops, go back to
 * whatever the sunlight rule wants.
 */
export class RainRule implements AutomationRule, SensorObserver<number> {
  readonly name = 'RainRule';
  private wasRaining: boolean;

  constructor(
    private readonly home: SmartHome,
    private readonly humidity: HumiditySensor,
    private readonly sunlightRule: SunlightRule,
  ) {
    this.wasRaining = humidity.isRaining;
  }

  onSensorChange(): void {
    const raining = this.humidity.isRaining;
    if (raining === this.wasRaining) return;
    this.wasRaining = raining;
    const source = ruleSource(this);

    if (!raining) {
      this.home.log(source, 'ฝนหยุดตกแล้ว → กลับไปทำงานตามแสงแดด');
      this.sunlightRule.apply();
      return;
    }

    this.home.log(source, `ความชื้น ${this.humidity.getValue()}% → ตรวจพบว่าฝนตก`);
    for (const curtain of this.home.devicesOf(Curtain)) {
      this.home.run(new SetCurtainCommand(curtain, true), source);
    }
    for (const light of this.home.devicesOf(FenceLight)) {
      this.home.run(new TurnOnCommand(light), source);
    }
    this.home.alert(source, 'ฝนตก! อย่าลืมเก็บผ้าที่ตากไว้ 🧺');
  }
}
