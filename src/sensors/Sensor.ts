/** Observer pattern: anything that wants to react to a sensor reading. */
export interface SensorObserver<T> {
  onSensorChange(sensor: Sensor<T>, value: T): void;
}

/** Subject: a mocked IoT sensor that notifies its observers on every new reading. */
export abstract class Sensor<T> {
  private readonly observers: SensorObserver<T>[] = [];
  protected value: T;

  constructor(
    readonly name: string,
    initial: T,
  ) {
    this.value = initial;
  }

  attach(observer: SensorObserver<T>): void {
    if (!this.observers.includes(observer)) this.observers.push(observer);
  }

  detach(observer: SensorObserver<T>): void {
    const index = this.observers.indexOf(observer);
    if (index >= 0) this.observers.splice(index, 1);
  }

  getValue(): T {
    return this.value;
  }

  setValue(value: T): void {
    this.value = value;
    this.notifyObservers();
  }

  protected notifyObservers(): void {
    for (const observer of [...this.observers]) observer.onSensorChange(this, this.value);
  }
}
