/**
 * An automation rule observes one or more sensors (Observer pattern) and sends
 * commands to devices. Rules that depend on elapsed time also implement update().
 */
export interface AutomationRule {
  readonly name: string;
  update?(dtMs: number): void;
}

export function ruleSource(rule: AutomationRule): string {
  return `AUTO:${rule.name}`;
}
