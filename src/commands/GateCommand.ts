import type { Gate } from '../devices/gate/Gate';
import type { Command } from './Command';

export type GateAction = 'open' | 'close';

export class GateCommand implements Command {
  constructor(
    private readonly gate: Gate,
    private readonly action: GateAction,
  ) {}

  get description(): string {
    return `${this.action === 'open' ? 'เปิด' : 'ปิด'}${this.gate.name}`;
  }

  isRedundant(): boolean {
    const state = this.gate.stateName;
    return this.action === 'open' ? state === 'opening' : state === 'closed' || state === 'closing';
  }

  execute(): void {
    if (this.action === 'open') this.gate.open();
    else this.gate.close();
  }

  undo(): void {
    if (this.action === 'open') this.gate.close();
    else this.gate.open();
  }
}
