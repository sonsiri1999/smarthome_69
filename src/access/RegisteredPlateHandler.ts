import { AccessHandler, type AccessRequest, type AccessResult } from './AccessHandler';
import type { PlateRepository } from './PlateRepository';

/** Step 2: the plate must be registered in the database. */
export class RegisteredPlateHandler extends AccessHandler {
  constructor(private readonly plates: PlateRepository) {
    super();
  }

  handle(request: AccessRequest): AccessResult {
    const plate = request.plate ?? '';
    if (!this.plates.isAllowed(plate)) {
      return { granted: false, reason: `ป้าย "${plate}" ไม่ได้ลงทะเบียนไว้` };
    }
    return super.handle(request);
  }
}
