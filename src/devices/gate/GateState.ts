import type { Gate } from './Gate';

/** Time for the gate to fully open or close. */
export const GATE_MOVE_MS = 2000;
/** How long the gate stays open before closing by itself. */
export const GATE_HOLD_MS = 5000;

export type GateStateName = 'closed' | 'opening' | 'open' | 'closing';

/** State pattern: each state decides how the gate reacts to open/close/time. */
export interface GateState {
  readonly name: GateStateName;
  readonly label: string;
  enter(gate: Gate): void;
  open(gate: Gate): void;
  close(gate: Gate): void;
  update(gate: Gate, dtMs: number): void;
}

export class ClosedState implements GateState {
  readonly name = 'closed';
  readonly label = 'ปิดสนิท';

  enter(gate: Gate): void {
    gate.position = 0;
  }

  open(gate: Gate): void {
    gate.setState(gate.openingState);
  }

  close(): void {}

  update(): void {}
}

export class OpeningState implements GateState {
  readonly name = 'opening';
  readonly label = 'กำลังเปิด';

  enter(): void {}

  open(): void {}

  close(gate: Gate): void {
    gate.setState(gate.closingState);
  }

  update(gate: Gate, dtMs: number): void {
    gate.position = Math.min(1, gate.position + dtMs / GATE_MOVE_MS);
    if (gate.position >= 1) gate.setState(gate.openState);
  }
}

export class OpenState implements GateState {
  readonly name = 'open';
  readonly label = 'เปิดสุด';

  enter(gate: Gate): void {
    gate.position = 1;
    gate.holdRemainingMs = GATE_HOLD_MS;
  }

  /** Opening again while already open restarts the auto-close countdown. */
  open(gate: Gate): void {
    gate.holdRemainingMs = GATE_HOLD_MS;
  }

  close(gate: Gate): void {
    gate.setState(gate.closingState);
  }

  update(gate: Gate, dtMs: number): void {
    gate.holdRemainingMs -= dtMs;
    if (gate.holdRemainingMs <= 0) gate.setState(gate.closingState);
  }
}

export class ClosingState implements GateState {
  readonly name = 'closing';
  readonly label = 'กำลังปิด';

  enter(): void {}

  /** Safety: a new open request while closing reverses the gate. */
  open(gate: Gate): void {
    gate.setState(gate.openingState);
  }

  close(): void {}

  update(gate: Gate, dtMs: number): void {
    gate.position = Math.max(0, gate.position - dtMs / GATE_MOVE_MS);
    if (gate.position <= 0) gate.setState(gate.closedState);
  }
}
