import type { AutomationRule } from '../automation/AutomationRule';
import type { Command } from '../commands/Command';
import { CommandInvoker } from '../commands/CommandInvoker';
import type { Device } from '../devices/Device';

export type LogLevel = 'info' | 'warn' | 'alert';

export interface LogEntry {
  id: number;
  time: Date;
  source: string;
  message: string;
  level: LogLevel;
}

type Listener<T> = (value: T) => void;
type DeviceClass<T extends Device> = abstract new (...args: never[]) => T;

/** Source name used for commands sent by the user from the UI. */
export const MANUAL = 'MANUAL';

/**
 * Singleton hub of the house: owns the devices, the automation rules,
 * the command invoker and the activity log.
 */
export class SmartHome {
  private static instance: SmartHome | null = null;

  static getInstance(): SmartHome {
    if (!SmartHome.instance) SmartHome.instance = new SmartHome();
    return SmartHome.instance;
  }

  /** Only for tests: start again with an empty house. */
  static resetInstance(): void {
    SmartHome.instance = null;
  }

  static readonly MAX_LOG = 200;

  readonly invoker = new CommandInvoker();
  private readonly devices = new Map<string, Device>();
  private readonly rules: AutomationRule[] = [];
  private readonly logEntries: LogEntry[] = [];
  private readonly logListeners: Listener<LogEntry>[] = [];
  private readonly alertListeners: Listener<LogEntry>[] = [];
  private nextLogId = 1;

  private constructor() {}

  addDevice(device: Device): void {
    if (this.devices.has(device.id)) throw new Error(`Duplicate device id: ${device.id}`);
    this.devices.set(device.id, device);
  }

  getDevice<T extends Device>(id: string, cls: DeviceClass<T>): T {
    const device = this.devices.get(id);
    if (!(device instanceof cls)) throw new Error(`No ${cls.name} with id "${id}"`);
    return device;
  }

  findDevice(id: string): Device | undefined {
    return this.devices.get(id);
  }

  get allDevices(): Device[] {
    return [...this.devices.values()];
  }

  devicesOf<T extends Device>(cls: DeviceClass<T>): T[] {
    return this.allDevices.filter((d): d is T => d instanceof cls);
  }

  addRule(rule: AutomationRule): void {
    this.rules.push(rule);
  }

  /**
   * Every change to a device goes through here, whether it comes from the user
   * (source = MANUAL) or from an automation rule. Only manual commands can be undone.
   */
  run(command: Command, source: string): boolean {
    if (!this.invoker.execute(command, source === MANUAL)) return false;
    this.log(source, command.description);
    return true;
  }

  undo(): boolean {
    const command = this.invoker.undo();
    if (!command) return false;
    this.log(MANUAL, `ย้อนกลับ: ${command.description}`);
    return true;
  }

  update(dtMs: number): void {
    for (const device of this.devices.values()) device.update(dtMs);
    for (const rule of this.rules) rule.update?.(dtMs);
  }

  log(source: string, message: string, level: LogLevel = 'info'): LogEntry {
    const entry: LogEntry = { id: this.nextLogId++, time: new Date(), source, message, level };
    this.logEntries.push(entry);
    if (this.logEntries.length > SmartHome.MAX_LOG) this.logEntries.shift();
    for (const listener of this.logListeners) listener(entry);
    return entry;
  }

  /** A log entry the user should notice right away (shown as a pop-up). */
  alert(source: string, message: string): void {
    const entry = this.log(source, message, 'alert');
    for (const listener of this.alertListeners) listener(entry);
  }

  get logs(): readonly LogEntry[] {
    return this.logEntries;
  }

  onLog(listener: Listener<LogEntry>): void {
    this.logListeners.push(listener);
  }

  onAlert(listener: Listener<LogEntry>): void {
    this.alertListeners.push(listener);
  }
}
