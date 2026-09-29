export type CarPhase = 'hidden' | 'approach' | 'waitGate' | 'enter' | 'parked' | 'rejected' | 'leave';

/** Drives the car sprite: road -> gate -> (driveway | back out). */
export class CarAnimator {
  static readonly WIDTH = 30;
  static readonly START_X = -34;
  static readonly STOP_X = 44;
  static readonly PARK_X = 104;
  static readonly SPEED = 0.045; // px per ms
  static readonly REJECT_WAIT_MS = 1500;
  static readonly GATE_WAIT_MS = 8000;

  x = CarAnimator.START_X;
  phase: CarPhase = 'hidden';
  onParked: (() => void) | null = null;
  private granted = false;
  private timerMs = 0;

  arrive(granted: boolean): void {
    this.granted = granted;
    this.x = CarAnimator.START_X;
    this.phase = 'approach';
  }

  update(dtMs: number, gateOpen: boolean): void {
    const step = CarAnimator.SPEED * dtMs;
    switch (this.phase) {
      case 'approach':
        this.x = Math.min(CarAnimator.STOP_X, this.x + step);
        if (this.x >= CarAnimator.STOP_X) {
          this.phase = this.granted ? 'waitGate' : 'rejected';
          this.timerMs = 0;
        }
        break;
      case 'waitGate':
        this.timerMs += dtMs;
        if (gateOpen) this.phase = 'enter';
        else if (this.timerMs > CarAnimator.GATE_WAIT_MS) this.phase = 'leave';
        break;
      case 'enter':
        this.x = Math.min(CarAnimator.PARK_X, this.x + step);
        if (this.x >= CarAnimator.PARK_X) {
          this.phase = 'parked';
          this.onParked?.();
        }
        break;
      case 'rejected':
        this.timerMs += dtMs;
        if (this.timerMs > CarAnimator.REJECT_WAIT_MS) this.phase = 'leave';
        break;
      case 'leave':
        this.x -= step;
        if (this.x <= CarAnimator.START_X) this.phase = 'hidden';
        break;
      case 'hidden':
      case 'parked':
        break;
    }
  }
}
