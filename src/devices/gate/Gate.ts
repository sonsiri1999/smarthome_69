import { Device } from '../Device';
import {
  ClosedState,
  ClosingState,
  OpeningState,
  OpenState,
  type GateState,
  type GateStateName,
} from './GateState';

/** Front gate. Behaviour is delegated to the current GateState (State pattern). */
export class Gate extends Device {
  readonly type = 'gate';

  readonly closedState = new ClosedState();
  readonly openingState = new OpeningState();
  readonly openState = new OpenState();
  readonly closingState = new ClosingState();

  private state: GateState = this.closedState;
  /** 0 = closed, 1 = fully open. */
  position = 0;
  holdRemainingMs = 0;
  onStateChange: ((state: GateState) => void) | null = null;

  get isOn(): boolean {
    return this.state !== this.closedState;
  }

  get stateName(): GateStateName {
    return this.state.name;
  }

  turnOn(): void {
    this.state.open(this);
  }

  turnOff(): void {
    this.state.close(this);
  }

  open(): void {
    this.turnOn();
  }

  close(): void {
    this.turnOff();
  }

  setState(state: GateState): void {
    this.state = state;
    state.enter(this);
    this.onStateChange?.(state);
  }

  update(dtMs: number): void {
    this.state.update(this, dtMs);
  }

  get statusText(): string {
    if (this.state === this.openState) {
      return `${this.state.label} (ปิดเองใน ${Math.ceil(this.holdRemainingMs / 1000)} วิ)`;
    }
    return this.state.label;
  }
}
