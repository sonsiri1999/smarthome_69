import { AirConditioner } from './AirConditioner';
import { Curtain } from './Curtain';
import type { Device, DeviceType, Zone } from './Device';
import { FenceLight } from './FenceLight';
import { Fridge } from './Fridge';
import { Gate } from './gate/Gate';
import { Light } from './Light';
import { TV } from './TV';

/** Factory pattern: the only place that knows which class backs each device type. */
export class DeviceFactory {
  static create(type: DeviceType, id: string, name: string, zone: Zone): Device {
    switch (type) {
      case 'light':
        return new Light(id, name, zone);
      case 'fenceLight':
        return new FenceLight(id, name, zone);
      case 'tv':
        return new TV(id, name, zone);
      case 'fridge':
        return new Fridge(id, name, zone);
      case 'aircon':
        return new AirConditioner(id, name, zone);
      case 'curtain':
        return new Curtain(id, name, zone);
      case 'gate':
        return new Gate(id, name, zone);
      default: {
        const unknown: never = type;
        throw new Error(`Unknown device type: ${unknown}`);
      }
    }
  }
}
