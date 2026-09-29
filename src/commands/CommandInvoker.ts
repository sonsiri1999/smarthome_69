import type { Command } from './Command';

/** Invoker: runs commands and keeps the history needed for undo. */
export class CommandInvoker {
  static readonly MAX_HISTORY = 50;
  private readonly history: Command[] = [];

  /** Runs the command. Returns false (and does nothing) when it would change nothing. */
  execute(command: Command, undoable: boolean): boolean {
    if (command.isRedundant()) return false;
    command.execute();
    if (undoable) {
      this.history.push(command);
      if (this.history.length > CommandInvoker.MAX_HISTORY) this.history.shift();
    }
    return true;
  }

  undo(): Command | null {
    const command = this.history.pop() ?? null;
    command?.undo();
    return command;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }
}
