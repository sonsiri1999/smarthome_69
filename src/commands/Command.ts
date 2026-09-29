/** Command pattern: every request to a device is wrapped in one of these. */
export interface Command {
  readonly description: string;
  /** True when executing would not change anything (device already in that state). */
  isRedundant(): boolean;
  execute(): void;
  undo(): void;
}
