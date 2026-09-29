import { TurnOffCommand } from '../commands/TurnOffCommand';
import { TurnOnCommand } from '../commands/TurnOnCommand';
import type { SmartHome } from '../core/SmartHome';
import { AirConditioner } from '../devices/AirConditioner';
import { ROOM_LABELS, ROOM_ZONES, type Device, type Room } from '../devices/Device';
import { Light } from '../devices/Light';
import { TV } from '../devices/TV';
import { occupiedRooms, type MotionSensor, type RoomMotionSensors } from '../sensors/MotionSensor';
import type { Sensor, SensorObserver } from '../sensors/Sensor';
import { ruleSource, type AutomationRule } from './AutomationRule';

/**
 * Lights and air conditioners follow people from room to room.
 * - Someone enters a room: turn on its light and air conditioner right away.
 * - A room becomes empty while people are still in the house: after a short delay
 *   (in case they come back) turn off its light, air conditioner and TV.
 * If the whole house becomes empty, NoMotionRule turns everything off after its timeout.
 */
export class RoomPresenceRule implements AutomationRule, SensorObserver<boolean> {
  static readonly DEFAULT_DELAY_MS = 5_000;
  readonly name = 'RoomPresenceRule';
  delayMs = RoomPresenceRule.DEFAULT_DELAY_MS;
  /** Rooms waiting to be switched off, with the time left. */
  private readonly pending = new Map<Room, number>();

  constructor(
    private readonly home: SmartHome,
    private readonly motion: RoomMotionSensors,
  ) {}

  /** Time left before the room is switched off, or null when nothing is scheduled. */
  pendingOffMs(room: Room): number | null {
    return this.pending.get(room) ?? null;
  }

  onSensorChange(sensor: Sensor<boolean>, detected: boolean): void {
    const room = (sensor as MotionSensor).room;
    const source = ruleSource(this);
    const occupied = occupiedRooms(this.motion);

    if (detected) {
      this.pending.delete(room);
      this.home.log(source, `ตรวจพบคนใน${ROOM_LABELS[room]}`);
      for (const device of this.devicesToTurnOn(room)) this.home.run(new TurnOnCommand(device), source);
      for (const other of ROOM_ZONES) {
        if (!occupied.includes(other)) this.schedule(other);
      }
      return;
    }

    if (occupied.length === 0) return; // house is empty: leave it to NoMotionRule
    this.schedule(room);
  }

  update(dtMs: number): void {
    for (const [room, remaining] of this.pending) {
      const left = remaining - dtMs;
      if (left > 0) {
        this.pending.set(room, left);
        continue;
      }
      this.pending.delete(room);
      if (this.motion[room].getValue()) continue;
      const source = ruleSource(this);
      this.home.log(source, `ไม่มีคนใน${ROOM_LABELS[room]}ครบ ${Math.round(this.delayMs / 1000)} วินาที → ปิดอุปกรณ์`);
      for (const device of this.devicesToTurnOff(room)) this.home.run(new TurnOffCommand(device), source);
    }
  }

  /** Starts the switch-off countdown, unless it's already running or there's nothing to turn off. */
  private schedule(room: Room): void {
    if (this.pending.has(room)) return;
    if (!this.devicesToTurnOff(room).some((d) => d.isOn)) return;
    this.pending.set(room, this.delayMs);
    this.home.log(
      ruleSource(this),
      `ไม่มีคนใน${ROOM_LABELS[room]} → จะปิดอุปกรณ์ใน ${Math.round(this.delayMs / 1000)} วินาที`,
    );
  }

  private devicesToTurnOn(room: Room): Device[] {
    return this.inRoom(room, [...this.home.devicesOf(Light), ...this.home.devicesOf(AirConditioner)]);
  }

  private devicesToTurnOff(room: Room): Device[] {
    return this.inRoom(room, [
      ...this.home.devicesOf(Light),
      ...this.home.devicesOf(AirConditioner),
      ...this.home.devicesOf(TV),
    ]);
  }

  private inRoom(room: Room, devices: Device[]): Device[] {
    return devices.filter((d) => d.zone === room);
  }
}
