import { MemoryStore, PlateRepository, type KeyValueStore } from '../access/PlateRepository';
import { CarArrivalRule } from '../automation/CarArrivalRule';
import { NoMotionRule } from '../automation/NoMotionRule';
import { RainRule } from '../automation/RainRule';
import { RoomPresenceRule } from '../automation/RoomPresenceRule';
import { SunlightRule } from '../automation/SunlightRule';
import type { DeviceType, Zone } from '../devices/Device';
import { DeviceFactory } from '../devices/DeviceFactory';
import { Gate } from '../devices/gate/Gate';
import { HumiditySensor } from '../sensors/HumiditySensor';
import { MotionSensor, type RoomMotionSensors } from '../sensors/MotionSensor';
import { PlateCameraSensor } from '../sensors/PlateCameraSensor';
import { SunlightSensor } from '../sensors/SunlightSensor';
import { SmartHome } from './SmartHome';

export interface HomeSystem {
  home: SmartHome;
  gate: Gate;
  plates: PlateRepository;
  sensors: {
    sunlight: SunlightSensor;
    humidity: HumiditySensor;
    motion: RoomMotionSensors;
    plateCamera: PlateCameraSensor;
  };
  rules: {
    sunlight: SunlightRule;
    rain: RainRule;
    carArrival: CarArrivalRule;
    roomPresence: RoomPresenceRule;
    noMotion: NoMotionRule;
  };
}

interface DeviceConfig {
  type: DeviceType;
  id: string;
  name: string;
  zone: Zone;
}

export const DEVICE_CONFIG: readonly DeviceConfig[] = [
  { type: 'light', id: 'light-living', name: 'ไฟห้องนั่งเล่น', zone: 'living' },
  { type: 'tv', id: 'tv-living', name: 'ทีวี', zone: 'living' },
  { type: 'aircon', id: 'aircon-living', name: 'แอร์ห้องนั่งเล่น', zone: 'living' },
  { type: 'curtain', id: 'curtain-living', name: 'ผ้าม่านห้องนั่งเล่น', zone: 'living' },
  { type: 'light', id: 'light-kitchen', name: 'ไฟห้องครัว', zone: 'kitchen' },
  { type: 'fridge', id: 'fridge-kitchen', name: 'ตู้เย็น', zone: 'kitchen' },
  { type: 'curtain', id: 'curtain-kitchen', name: 'ผ้าม่านห้องครัว', zone: 'kitchen' },
  { type: 'light', id: 'light-bedroom', name: 'ไฟห้องนอน', zone: 'bedroom' },
  { type: 'aircon', id: 'aircon-bedroom', name: 'แอร์ห้องนอน', zone: 'bedroom' },
  { type: 'curtain', id: 'curtain-bedroom', name: 'ผ้าม่านห้องนอน', zone: 'bedroom' },
  { type: 'gate', id: 'gate-front', name: 'ประตูรั้วหน้าบ้าน', zone: 'outdoor' },
  { type: 'fenceLight', id: 'fence-gate', name: 'ไฟเสาประตูรั้ว', zone: 'outdoor' },
  { type: 'fenceLight', id: 'fence-front', name: 'ไฟรอบรั้วบ้าน', zone: 'outdoor' },
];

/** Builds the house: devices (via the factory), mocked sensors and the automation rules. */
export function createHomeSystem(store: KeyValueStore = new MemoryStore()): HomeSystem {
  const home = SmartHome.getInstance();
  for (const d of DEVICE_CONFIG) home.addDevice(DeviceFactory.create(d.type, d.id, d.name, d.zone));

  const gate = home.getDevice('gate-front', Gate);
  gate.onStateChange = (state) => home.log('DEVICE', `${gate.name}: ${state.label}`);

  const plates = new PlateRepository(store);
  const sensors = {
    sunlight: new SunlightSensor(70),
    humidity: new HumiditySensor(50),
    // the resident starts in the living room
    motion: {
      living: new MotionSensor('living', true),
      kitchen: new MotionSensor('kitchen'),
      bedroom: new MotionSensor('bedroom'),
    },
    plateCamera: new PlateCameraSensor(),
  };

  const sunlight = new SunlightRule(home, sensors.humidity);
  const rules = {
    sunlight,
    rain: new RainRule(home, sensors.humidity, sunlight),
    carArrival: new CarArrivalRule(home, plates, gate),
    roomPresence: new RoomPresenceRule(home, sensors.motion),
    noMotion: new NoMotionRule(home, sensors.motion),
  };

  sensors.sunlight.attach(rules.sunlight);
  sensors.humidity.attach(rules.rain);
  sensors.plateCamera.attach(rules.carArrival);
  for (const motion of Object.values(sensors.motion)) {
    motion.attach(rules.roomPresence);
    motion.attach(rules.noMotion);
  }
  for (const rule of Object.values(rules)) home.addRule(rule);

  home.log('SYSTEM', 'ระบบบ้านอัจฉริยะเริ่มทำงาน');
  // first reading, so the house starts in the state that matches the current light level
  sensors.sunlight.setValue(sensors.sunlight.getValue());

  return { home, gate, plates, sensors, rules };
}
