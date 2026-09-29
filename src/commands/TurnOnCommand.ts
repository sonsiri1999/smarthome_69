import type { Device } from '../devices/Device';
import type { Command } from './Command';

export class TurnOnCommand implements Command {
  private wasOn = false;

  constructor(private readonly device: Device) {}

  get description(): string {
    return `เปิด${this.device.name}`;
  }

  isRedundant(): boolean {
    return this.device.isOn;
  }

  execute(): void {
    this.wasOn = this.device.isOn;
    this.device.turnOn();
  }

  undo(): void {
    if (!this.wasOn) this.device.turnOff();
  }
}
