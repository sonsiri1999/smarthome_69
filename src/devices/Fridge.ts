import { Device, type Zone } from './Device';

/** The fridge runs all the time, so automation never switches it off. */
export class Fridge extends Device {
  readonly type = 'fridge';

  constructor(id: string, name: string, zone: Zone) {
    super(id, name, zone);
    this.on = true;
  }

  get statusText(): string {
    return this.on ? 'ทำงาน' : 'ปิด';
  }
}
