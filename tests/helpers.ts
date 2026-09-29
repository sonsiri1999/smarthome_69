import { MemoryStore } from '../src/access/PlateRepository';
import { createHomeSystem, type HomeSystem } from '../src/core/createHomeSystem';
import { SmartHome } from '../src/core/SmartHome';
import { AirConditioner } from '../src/devices/AirConditioner';
import { Curtain } from '../src/devices/Curtain';
import { ROOM_ZONES, type Room } from '../src/devices/Device';
import { FenceLight } from '../src/devices/FenceLight';
import { Light } from '../src/devices/Light';
import { TV } from '../src/devices/TV';

export function freshSystem(): HomeSystem {
  SmartHome.resetInstance();
  return createHomeSystem(new MemoryStore());
}

export const curtains = (s: HomeSystem) => s.home.devicesOf(Curtain);
export const fenceLights = (s: HomeSystem) => s.home.devicesOf(FenceLight);
export const aircons = (s: HomeSystem) => s.home.devicesOf(AirConditioner);
export const indoorLights = (s: HomeSystem) => s.home.devicesOf(Light);
export const tvs = (s: HomeSystem) => s.home.devicesOf(TV);

export const lightIn = (s: HomeSystem, room: Room) => indoorLights(s).find((d) => d.zone === room)!;
export const airconIn = (s: HomeSystem, room: Room) => aircons(s).find((d) => d.zone === room)!;

export function nobodyHome(s: HomeSystem): void {
  for (const room of ROOM_ZONES) s.sensors.motion[room].setValue(false);
}
