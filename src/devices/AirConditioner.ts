import { Device } from './Device';

export class AirConditioner extends Device {
  readonly type = 'aircon';
  temperature = 25;

  get statusText(): string {
    return this.on ? `เปิด ${this.temperature}°C` : 'ปิด';
  }
}
