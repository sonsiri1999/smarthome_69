import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore, PlateRepository } from '../src/access/PlateRepository';
import { createToggleCommand } from '../src/commands/createToggleCommand';
import { TurnOnCommand } from '../src/commands/TurnOnCommand';
import type { HomeSystem } from '../src/core/createHomeSystem';
import { MANUAL, SmartHome } from '../src/core/SmartHome';
import { AirConditioner } from '../src/devices/AirConditioner';
import { Curtain } from '../src/devices/Curtain';
import { DeviceFactory } from '../src/devices/DeviceFactory';
import { Gate } from '../src/devices/gate/Gate';
import { Light } from '../src/devices/Light';
import { TV } from '../src/devices/TV';
import type { Sensor, SensorObserver } from '../src/sensors/Sensor';
import { SunlightSensor } from '../src/sensors/SunlightSensor';
import { freshSystem } from './helpers';

let s: HomeSystem;

beforeEach(() => {
  s = freshSystem();
});

describe('Singleton', () => {
  it('always returns the same SmartHome', () => {
    expect(SmartHome.getInstance()).toBe(s.home);
  });
});

describe('Factory', () => {
  it('creates the right class for each type', () => {
    expect(DeviceFactory.create('light', 'x', 'x', 'living')).toBeInstanceOf(Light);
    expect(DeviceFactory.create('aircon', 'x', 'x', 'living')).toBeInstanceOf(AirConditioner);
    expect(DeviceFactory.create('gate', 'x', 'x', 'outdoor')).toBeInstanceOf(Gate);
  });
});

describe('Observer', () => {
  it('notifies attached observers and stops after detach', () => {
    const sensor = new SunlightSensor(50);
    const seen: number[] = [];
    const observer: SensorObserver<number> = {
      onSensorChange: (_s: Sensor<number>, v: number) => seen.push(v),
    };
    sensor.attach(observer);
    sensor.setValue(20);
    sensor.detach(observer);
    sensor.setValue(30);
    expect(seen).toEqual([20]);
  });

  it('clamps sunlight readings to 0..100', () => {
    const sensor = new SunlightSensor();
    sensor.setValue(150);
    expect(sensor.getValue()).toBe(100);
  });
});

describe('Command', () => {
  it('undoes manual commands in reverse order', () => {
    const light = s.home.getDevice('light-living', Light);
    const curtain = s.home.getDevice('curtain-living', Curtain);
    const wasClosed = curtain.isClosed;

    s.home.run(createToggleCommand(light), MANUAL);
    s.home.run(createToggleCommand(curtain), MANUAL);
    expect(light.isOn).toBe(true);
    expect(curtain.isClosed).toBe(!wasClosed);

    s.home.undo();
    expect(curtain.isClosed).toBe(wasClosed);
    s.home.undo();
    expect(light.isOn).toBe(false);
    expect(s.home.invoker.canUndo).toBe(false);
  });

  it('does not put automatic commands in the undo history', () => {
    s.sensors.sunlight.setValue(5);
    expect(s.home.invoker.canUndo).toBe(false);
  });

  it('skips commands that would change nothing', () => {
    const light = s.home.getDevice('light-living', Light);
    light.turnOn();
    expect(s.home.run(new TurnOnCommand(light), MANUAL)).toBe(false);
  });

  it('logs who sent each command', () => {
    s.home.run(createToggleCommand(s.home.getDevice('tv-living', TV)), MANUAL);
    expect(s.home.logs.at(-1)?.source).toBe(MANUAL);
    s.sensors.sunlight.setValue(5);
    expect(s.home.logs.at(-1)?.source).toBe('AUTO:SunlightRule');
  });
});

describe('State (gate)', () => {
  it('reverses when asked to open while closing', () => {
    s.gate.open();
    s.home.update(2000);
    s.gate.close();
    expect(s.gate.stateName).toBe('closing');
    s.home.update(500);
    s.gate.open();
    expect(s.gate.stateName).toBe('opening');
  });

  it('restarts the auto-close countdown when opened again while open', () => {
    s.gate.open();
    s.home.update(2000);
    s.home.update(4000);
    s.gate.open();
    s.home.update(4000);
    expect(s.gate.stateName).toBe('open');
  });
});

describe('PlateRepository', () => {
  it('persists plates in the given store', () => {
    const store = new MemoryStore();
    new PlateRepository(store).add('ทด 42');
    expect(new PlateRepository(store).isAllowed('ทด42')).toBe(true);
  });

  it('rejects duplicates and blanks', () => {
    const repo = new PlateRepository();
    expect(repo.add('กข1234')).toBe(false);
    expect(repo.add('  ')).toBe(false);
  });

  it('falls back to defaults when the stored data is broken', () => {
    const store = new MemoryStore();
    store.setItem(PlateRepository.STORAGE_KEY, '{not json');
    expect(new PlateRepository(store).list()).toEqual(PlateRepository.DEFAULT_PLATES);
  });
});
