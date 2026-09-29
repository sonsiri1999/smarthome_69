import { Sensor } from './Sensor';

/** Camera at the gate that reads the licence plate of an arriving car. */
export class PlateCameraSensor extends Sensor<string | null> {
  constructor() {
    super('กล้องอ่านป้ายทะเบียน', null);
  }

  detect(plate: string): void {
    this.setValue(plate);
  }
}
