import { AccessHandler, type AccessResult } from '../access/AccessHandler';
import { OpenGateHandler } from '../access/OpenGateHandler';
import { PlateDetectedHandler } from '../access/PlateDetectedHandler';
import type { PlateRepository } from '../access/PlateRepository';
import { RegisteredPlateHandler } from '../access/RegisteredPlateHandler';
import { TurnOnCommand } from '../commands/TurnOnCommand';
import type { SmartHome } from '../core/SmartHome';
import { AirConditioner } from '../devices/AirConditioner';
import type { Gate } from '../devices/gate/Gate';
import { Light } from '../devices/Light';
import type { Sensor, SensorObserver } from '../sensors/Sensor';
import { ruleSource, type AutomationRule } from './AutomationRule';

/**
 * UC1: a car at the gate is checked by a chain of handlers; a registered plate opens the gate
 * (which then closes by itself, see GateState).
 * UC5: once a resident's car is let in, turn on the air conditioners and the living room light.
 */
export class CarArrivalRule implements AutomationRule, SensorObserver<string | null> {
  readonly name = 'CarArrivalRule';
  private readonly chain: AccessHandler;
  /** Lets the UI animate the car depending on the result. */
  onResult: ((plate: string, result: AccessResult) => void) | null = null;

  constructor(
    private readonly home: SmartHome,
    plates: PlateRepository,
    gate: Gate,
  ) {
    const first = new PlateDetectedHandler();
    first
      .setNext(new RegisteredPlateHandler(plates))
      .setNext(new OpenGateHandler(home, gate, ruleSource(this)));
    this.chain = first;
  }

  onSensorChange(_sensor: Sensor<string | null>, plate: string | null): void {
    if (plate === null) return;
    const source = ruleSource(this);
    this.home.log(source, `กล้องตรวจพบรถ ป้าย "${plate}"`);

    const result = this.chain.handle({ plate });
    if (result.granted) {
      this.home.log(source, result.reason);
      for (const aircon of this.home.devicesOf(AirConditioner)) {
        this.home.run(new TurnOnCommand(aircon), source);
      }
      for (const light of this.home.devicesOf(Light).filter((l) => l.zone === 'living')) {
        this.home.run(new TurnOnCommand(light), source);
      }
    } else {
      this.home.log(source, `ไม่เปิดประตู: ${result.reason}`, 'warn');
    }
    this.onResult?.(plate, result);
  }
}
