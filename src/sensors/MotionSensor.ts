import { ROOM_LABELS, ROOM_ZONES, type Room } from '../devices/Device';
import { Sensor } from './Sensor';

/** True while someone is detected in one room of the house. */
export class MotionSensor extends Sensor<boolean> {
  constructor(
    readonly room: Room,
    initial = false,
  ) {
    super(`เซ็นเซอร์ตรวจจับคน (${ROOM_LABELS[room]})`, initial);
  }
}

/** One motion sensor per room. */
export type RoomMotionSensors = Record<Room, MotionSensor>;

export function occupiedRooms(sensors: RoomMotionSensors): Room[] {
  return ROOM_ZONES.filter((room) => sensors[room].getValue());
}

/** Moves the (single) resident to one room: that room detects someone, the others don't. */
export function moveResidentTo(sensors: RoomMotionSensors, target: Room): void {
  // enter the new room first, so the house never looks empty in between
  sensors[target].setValue(true);
  for (const room of ROOM_ZONES) {
    if (room !== target && sensors[room].getValue()) sensors[room].setValue(false);
  }
}
