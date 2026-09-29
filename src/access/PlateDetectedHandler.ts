import { AccessHandler, type AccessRequest, type AccessResult } from './AccessHandler';

/** Step 1: the camera must have read a plate at all. */
export class PlateDetectedHandler extends AccessHandler {
  handle(request: AccessRequest): AccessResult {
    if (!request.plate || !request.plate.trim()) {
      return { granted: false, reason: 'กล้องอ่านป้ายทะเบียนไม่ได้' };
    }
    return super.handle(request);
  }
}
