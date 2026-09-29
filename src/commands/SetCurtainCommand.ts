import type { Curtain } from '../devices/Curtain';
import type { Command } from './Command';

export class SetCurtainCommand implements Command {
  private wasClosed = false;

  constructor(
    private readonly curtain: Curtain,
    private readonly closed: boolean,
  ) {}

  get description(): string {
    return `เลื่อน${this.curtain.name}${this.closed ? 'ลง' : 'ขึ้น'}`;
  }

  isRedundant(): boolean {
    return this.curtain.isClosed === this.closed;
  }

  execute(): void {
    this.wasClosed = this.curtain.isClosed;
    if (this.closed) this.curtain.close();
    else this.curtain.open();
  }

  undo(): void {
    if (this.wasClosed) this.curtain.close();
    else this.curtain.open();
  }
}
