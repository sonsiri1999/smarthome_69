import { Sensor } from './Sensor';

/** Sunlight level in percent (0 = pitch dark, 100 = full sun). */
export class SunlightSensor extends Sensor<number> {
  constructor(initial = 70) {
    super('เซ็นเซอร์แสงแดด', initial);
  }

  setValue(value: number): void {
    super.setValue(Math.max(0, Math.min(100, Math.round(value))));
  }
}
