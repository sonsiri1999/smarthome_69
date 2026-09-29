import { Device } from './Device';

/**
 * Motorised curtain. "On" means the curtain is lowered and covers the window.
 * `position` animates towards the target: 0 = fully up, 1 = fully down.
 */
export class Curtain extends Device {
  static readonly MOVE_MS = 1500;
  readonly type = 'curtain';
  position = 0;

  get isClosed(): boolean {
    return this.on;
  }

  close(): void {
    this.turnOn();
  }

  open(): void {
    this.turnOff();
  }

  update(dtMs: number): void {
    const target = this.on ? 1 : 0;
    const step = dtMs / Curtain.MOVE_MS;
    if (this.position < target) this.position = Math.min(target, this.position + step);
    else if (this.position > target) this.position = Math.max(target, this.position - step);
  }

  get statusText(): string {
    const moving = this.position !== (this.on ? 1 : 0);
    if (moving) return this.on ? 'กำลังเลื่อนลง' : 'กำลังเลื่อนขึ้น';
    return this.on ? 'ม่านลง (ปิดหน้าต่าง)' : 'ม่านขึ้น (เปิดหน้าต่าง)';
  }
}
