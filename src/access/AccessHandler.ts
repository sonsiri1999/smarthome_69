export interface AccessRequest {
  plate: string | null;
}

export interface AccessResult {
  granted: boolean;
  reason: string;
}

/** Chain of Responsibility: each handler checks one thing, then passes the request on. */
export abstract class AccessHandler {
  private next: AccessHandler | null = null;

  /** Returns the handler passed in so calls can be chained: a.setNext(b).setNext(c). */
  setNext(handler: AccessHandler): AccessHandler {
    this.next = handler;
    return handler;
  }

  handle(request: AccessRequest): AccessResult {
    if (this.next) return this.next.handle(request);
    return { granted: true, reason: 'ผ่านการตรวจสอบทั้งหมด' };
  }
}
