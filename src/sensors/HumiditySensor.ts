import { Sensor } from './Sensor';

/** Humidity in percent. High humidity is treated as rain, with hysteresis so it doesn't flicker. */
export class HumiditySensor extends Sensor<number> {
  static readonly RAIN_START = 85;
  static readonly RAIN_STOP = 75;
  private raining = false;

  constructor(initial = 50) {
    super('เซ็นเซอร์ความชื้น', initial);
    this.raining = initial >= HumiditySensor.RAIN_START;
  }

  get isRaining(): boolean {
    return this.raining;
  }

  setValue(value: number): void {
    const humidity = Math.max(0, Math.min(100, Math.round(value)));
    if (humidity >= HumiditySensor.RAIN_START) this.raining = true;
    else if (humidity < HumiditySensor.RAIN_STOP) this.raining = false;
    super.setValue(humidity);
  }
}
