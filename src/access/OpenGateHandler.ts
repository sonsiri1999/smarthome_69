import { GateCommand } from '../commands/GateCommand';
import type { SmartHome } from '../core/SmartHome';
import type { Gate } from '../devices/gate/Gate';
import { AccessHandler, type AccessRequest, type AccessResult } from './AccessHandler';

/** Last step: every check passed, so open the gate. */
export class OpenGateHandler extends AccessHandler {
  constructor(
    private readonly home: SmartHome,
    private readonly gate: Gate,
    private readonly source: string,
  ) {
    super();
  }

  handle(request: AccessRequest): AccessResult {
    this.home.run(new GateCommand(this.gate, 'open'), this.source);
    return { granted: true, reason: `อนุญาตป้าย "${request.plate}" เข้าบ้าน` };
  }
}
