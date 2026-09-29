import { beforeEach, describe, expect, it } from 'vitest';
import type { HomeSystem } from '../src/core/createHomeSystem';
import { Fridge } from '../src/devices/Fridge';
import { Light } from '../src/devices/Light';
import { GATE_HOLD_MS, GATE_MOVE_MS } from '../src/devices/gate/GateState';
import { moveResidentTo } from '../src/sensors/MotionSensor';
import {
  airconIn,
  aircons,
  curtains,
  fenceLights,
  freshSystem,
  indoorLights,
  lightIn,
  nobodyHome,
  tvs,
} from './helpers';

let s: HomeSystem;

beforeEach(() => {
  s = freshSystem();
});

describe('UC1: registered car opens the gate, which closes by itself', () => {
  it('runs the gate through opening -> open -> closing -> closed', () => {
    s.sensors.plateCamera.detect('กข 1234');
    expect(s.gate.stateName).toBe('opening');

    s.home.update(GATE_MOVE_MS);
    expect(s.gate.stateName).toBe('open');

    s.home.update(GATE_HOLD_MS);
    expect(s.gate.stateName).toBe('closing');

    s.home.update(GATE_MOVE_MS);
    expect(s.gate.stateName).toBe('closed');
  });

  it('matches plates regardless of spacing', () => {
    s.sensors.plateCamera.detect('กข1234');
    expect(s.gate.stateName).toBe('opening');
  });

  it('keeps the gate closed for an unregistered plate', () => {
    let granted: boolean | null = null;
    s.rules.carArrival.onResult = (_plate, result) => (granted = result.granted);

    s.sensors.plateCamera.detect('ขค 5678');

    expect(granted).toBe(false);
    expect(s.gate.stateName).toBe('closed');
    expect(s.home.logs.some((l) => l.level === 'warn' && l.message.includes('ขค 5678'))).toBe(true);
  });

  it('rejects an unreadable plate', () => {
    s.sensors.plateCamera.detect('   ');
    expect(s.gate.stateName).toBe('closed');
  });

  it('lets a newly registered plate in', () => {
    s.plates.add('ขค 5678');
    s.sensors.plateCamera.detect('ขค 5678');
    expect(s.gate.stateName).toBe('opening');
  });
});

describe('UC2 + UC3: sunlight controls fence lights and curtains', () => {
  it('starts in day mode: fence lights off, curtains down', () => {
    expect(fenceLights(s).every((l) => !l.isOn)).toBe(true);
    expect(curtains(s).every((c) => c.isClosed)).toBe(true);
  });

  it('switches to night mode when the sun is gone', () => {
    s.sensors.sunlight.setValue(10);
    expect(s.rules.sunlight.period).toBe('night');
    expect(fenceLights(s).every((l) => l.isOn)).toBe(true);
    expect(curtains(s).every((c) => !c.isClosed)).toBe(true);
  });

  it('switches back to day mode when the sun is out', () => {
    s.sensors.sunlight.setValue(10);
    s.sensors.sunlight.setValue(80);
    expect(fenceLights(s).every((l) => !l.isOn)).toBe(true);
    expect(curtains(s).every((c) => c.isClosed)).toBe(true);
  });

  it('keeps the current mode between the thresholds (hysteresis)', () => {
    s.sensors.sunlight.setValue(10);
    s.sensors.sunlight.setValue(35);
    expect(s.rules.sunlight.period).toBe('night');
  });
});

describe('UC4: rain', () => {
  it('lowers curtains, turns on fence lights and alerts the user', () => {
    const alerts: string[] = [];
    s.home.onAlert((e) => alerts.push(e.message));
    s.sensors.sunlight.setValue(10); // night: curtains up

    s.sensors.humidity.setValue(90);

    expect(s.sensors.humidity.isRaining).toBe(true);
    expect(curtains(s).every((c) => c.isClosed)).toBe(true);
    expect(fenceLights(s).every((l) => l.isOn)).toBe(true);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toContain('เก็บผ้า');
  });

  it('keeps curtains down at night while it is raining', () => {
    s.sensors.humidity.setValue(90);
    s.sensors.sunlight.setValue(10);
    expect(curtains(s).every((c) => c.isClosed)).toBe(true);
  });

  it('keeps fence lights on during a daytime rain', () => {
    s.sensors.humidity.setValue(90);
    s.sensors.sunlight.setValue(10);
    s.sensors.sunlight.setValue(80);
    expect(fenceLights(s).every((l) => l.isOn)).toBe(true);
  });

  it('goes back to the sunlight behaviour when the rain stops', () => {
    s.sensors.sunlight.setValue(10);
    s.sensors.humidity.setValue(90);
    s.sensors.humidity.setValue(60);
    expect(s.sensors.humidity.isRaining).toBe(false);
    expect(curtains(s).every((c) => !c.isClosed)).toBe(true);
    expect(fenceLights(s).every((l) => l.isOn)).toBe(true);
  });

  it('does not stop raining inside the hysteresis band', () => {
    s.sensors.humidity.setValue(90);
    s.sensors.humidity.setValue(80);
    expect(s.sensors.humidity.isRaining).toBe(true);
  });
});

describe('UC5: a resident car turns on the air conditioners and the living room light', () => {
  it('turns on every air conditioner and the living room light', () => {
    s.sensors.plateCamera.detect('1กก 9999');
    expect(aircons(s).every((a) => a.isOn)).toBe(true);
    expect(lightIn(s, 'living').isOn).toBe(true);
    expect(lightIn(s, 'bedroom').isOn).toBe(false);
  });

  it('leaves everything off for a stranger', () => {
    s.sensors.plateCamera.detect('ขค 5678');
    expect(aircons(s).every((a) => !a.isOn)).toBe(true);
    expect(lightIn(s, 'living').isOn).toBe(false);
  });

  it('turns the living room light off together with the air conditioners when nobody is home', () => {
    s.sensors.plateCamera.detect('กข 1234');
    nobodyHome(s);
    s.home.update(s.rules.noMotion.timeoutMs);
    expect(lightIn(s, 'living').isOn).toBe(false);
    expect(aircons(s).every((a) => !a.isOn)).toBe(true);
  });
});

describe('Room presence: lights and air conditioners follow the resident', () => {
  const delay = () => s.rules.roomPresence.delayMs;

  it('turns on the room someone enters right away', () => {
    moveResidentTo(s.sensors.motion, 'bedroom');
    expect(lightIn(s, 'bedroom').isOn).toBe(true);
    expect(airconIn(s, 'bedroom').isOn).toBe(true);
  });

  it('going to the bedroom turns the living room and kitchen off, but only after the delay', () => {
    for (const d of [...indoorLights(s), ...aircons(s)]) d.turnOn();

    moveResidentTo(s.sensors.motion, 'bedroom');
    expect(lightIn(s, 'living').isOn).toBe(true);
    expect(s.rules.roomPresence.pendingOffMs('living')).toBe(delay());

    s.home.update(delay() - 1);
    expect(lightIn(s, 'living').isOn).toBe(true);
    expect(lightIn(s, 'kitchen').isOn).toBe(true);

    s.home.update(1);
    expect(lightIn(s, 'living').isOn).toBe(false);
    expect(airconIn(s, 'living').isOn).toBe(false);
    expect(lightIn(s, 'kitchen').isOn).toBe(false);
    expect(lightIn(s, 'bedroom').isOn).toBe(true);
  });

  it('turns off the living room TV when nobody is there', () => {
    tvs(s)[0].turnOn();
    moveResidentTo(s.sensors.motion, 'kitchen');
    s.home.update(delay());
    expect(tvs(s)[0].isOn).toBe(false);
  });

  it('never turns the TV on by itself', () => {
    moveResidentTo(s.sensors.motion, 'bedroom');
    moveResidentTo(s.sensors.motion, 'living');
    expect(tvs(s)[0].isOn).toBe(false);
  });

  it('leaving the bedroom for the living room swaps which room is on', () => {
    moveResidentTo(s.sensors.motion, 'bedroom');
    moveResidentTo(s.sensors.motion, 'living');
    expect(lightIn(s, 'living').isOn).toBe(true);
    expect(airconIn(s, 'living').isOn).toBe(true);
    expect(lightIn(s, 'bedroom').isOn).toBe(true);

    s.home.update(delay());
    expect(lightIn(s, 'bedroom').isOn).toBe(false);
    expect(airconIn(s, 'bedroom').isOn).toBe(false);
  });

  it('cancels the switch-off when the resident comes back in time', () => {
    moveResidentTo(s.sensors.motion, 'bedroom');
    moveResidentTo(s.sensors.motion, 'kitchen');
    s.home.update(delay() - 1000);
    moveResidentTo(s.sensors.motion, 'bedroom');
    s.home.update(delay());
    expect(lightIn(s, 'bedroom').isOn).toBe(true);
    expect(s.rules.roomPresence.pendingOffMs('bedroom')).toBeNull();
  });

  it('keeps an occupied room on when someone else enters another room', () => {
    s.home.getDevice('light-living', Light).turnOn();
    s.sensors.motion.bedroom.setValue(true); // living is still occupied
    s.home.update(delay());
    expect(lightIn(s, 'living').isOn).toBe(true);
    expect(lightIn(s, 'bedroom').isOn).toBe(true);
  });

  it('leaves the last room alone when the house empties (UC6 handles it after the timeout)', () => {
    moveResidentTo(s.sensors.motion, 'kitchen');
    nobodyHome(s);
    s.home.update(delay());
    expect(lightIn(s, 'kitchen').isOn).toBe(true);
    s.home.update(s.rules.noMotion.timeoutMs);
    expect(lightIn(s, 'kitchen').isOn).toBe(false);
  });
});

describe('UC6: nobody in any room turns things off', () => {
  function switchEverythingOn() {
    for (const d of [...indoorLights(s), ...tvs(s), ...aircons(s)]) d.turnOn();
  }

  it('turns off lights, TV and air conditioners after the timeout, but not the fridge', () => {
    switchEverythingOn();
    nobodyHome(s);

    s.home.update(s.rules.noMotion.timeoutMs - 1);
    expect(tvs(s).every((d) => d.isOn)).toBe(true);

    s.home.update(1);
    expect([...indoorLights(s), ...tvs(s), ...aircons(s)].every((d) => !d.isOn)).toBe(true);
    expect(s.home.getDevice('fridge-kitchen', Fridge).isOn).toBe(true);
  });

  it('restarts the countdown when someone is detected again', () => {
    switchEverythingOn();
    nobodyHome(s);
    s.home.update(s.rules.noMotion.timeoutMs - 1000);
    s.sensors.motion.living.setValue(true);
    s.sensors.motion.living.setValue(false);
    s.home.update(s.rules.noMotion.timeoutMs - 1000);
    expect(tvs(s).every((d) => d.isOn)).toBe(true);
  });

  it('does nothing while someone is in the house', () => {
    switchEverythingOn(); // the resident starts in the living room, next to the TV
    s.home.update(60_000);
    expect(tvs(s).every((d) => d.isOn)).toBe(true);
    expect(s.rules.noMotion.remainingMs).toBeNull();
  });
});

