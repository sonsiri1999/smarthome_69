import type { HomeSystem } from '../core/createHomeSystem';
import { ROOM_LABELS, ROOM_ZONES, type Room } from '../devices/Device';
import { moveResidentTo } from '../sensors/MotionSensor';
import { h, setText } from './dom';

const STRANGER_PLATES = ['ขค 5678', '9กด 4321', 'ฮฮ 0001'];

/** Mock IoT inputs: the user plays the role of the sensors. */
export class SensorPanel {
  private readonly sunlightLabel: HTMLElement;
  private readonly humidityLabel: HTMLElement;
  private readonly motionButtons: Array<{ room: Room; button: HTMLButtonElement }> = [];
  private readonly countdown: HTMLElement;
  private readonly plateInput: HTMLInputElement;

  constructor(
    root: HTMLElement,
    private readonly system: HomeSystem,
  ) {
    const { sensors, rules } = system;

    this.sunlightLabel = h('output');
    const sunlight = h('input', {
      type: 'range',
      min: 0,
      max: 100,
      value: sensors.sunlight.getValue(),
      'aria-label': 'ระดับแสงแดด',
    });
    sunlight.addEventListener('input', () => sensors.sunlight.setValue(Number(sunlight.value)));

    this.humidityLabel = h('output');
    const humidity = h('input', {
      type: 'range',
      min: 0,
      max: 100,
      value: sensors.humidity.getValue(),
      'aria-label': 'ความชื้น',
    });
    humidity.addEventListener('input', () => sensors.humidity.setValue(Number(humidity.value)));

    const motionRows = ROOM_ZONES.map((room) => {
      const sensor = sensors.motion[room];
      const button = h('button', {
        class: 'btn btn-wide',
        onclick: () => sensor.setValue(!sensor.getValue()),
      });
      this.motionButtons.push({ room, button });
      return h(
        'div',
        { class: 'motion-row' },
        button,
        h(
          'button',
          {
            class: 'chip',
            title: `ย้ายคนไป${ROOM_LABELS[room]} (ห้องอื่นจะไม่มีคน)`,
            onclick: () => moveResidentTo(sensors.motion, room),
          },
          'เดินไปห้องนี้',
        ),
      );
    });
    const leaveHome = h(
      'button',
      {
        class: 'chip',
        onclick: () => {
          for (const room of ROOM_ZONES) sensors.motion[room].setValue(false);
        },
      },
      '🚪 ทุกคนออกจากบ้าน',
    );
    this.countdown = h('span', { class: 'hint' });
    const timeout = h('input', {
      type: 'number',
      min: 3,
      max: 300,
      value: rules.noMotion.timeoutMs / 1000,
      class: 'num',
      'aria-label': 'เวลารอก่อนปิดอุปกรณ์ (วินาที)',
    });
    timeout.addEventListener('change', () => {
      const seconds = Math.max(3, Math.min(300, Number(timeout.value) || 10));
      timeout.value = String(seconds);
      rules.noMotion.timeoutMs = seconds * 1000;
    });
    const roomDelay = h('input', {
      type: 'number',
      min: 1,
      max: 300,
      value: rules.roomPresence.delayMs / 1000,
      class: 'num',
      'aria-label': 'หน่วงเวลาก่อนปิดอุปกรณ์เมื่อออกจากห้อง (วินาที)',
    });
    roomDelay.addEventListener('change', () => {
      const seconds = Math.max(1, Math.min(300, Number(roomDelay.value) || 5));
      roomDelay.value = String(seconds);
      rules.roomPresence.delayMs = seconds * 1000;
    });

    const firstPlate = system.plates.list()[0] ?? '';
    this.plateInput = h('input', { type: 'text', value: firstPlate, placeholder: 'เช่น กข 1234', class: 'text' });
    const sendCar = () => sensors.plateCamera.detect(this.plateInput.value);
    this.plateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendCar();
    });

    root.append(
      h('h2', {}, 'จำลองค่าจาก IoT Sensor'),
      h('div', { class: 'field' }, h('label', {}, '☀️ แสงแดด'), sunlight, this.sunlightLabel),
      h('div', { class: 'field' }, h('label', {}, '💧 ความชื้น'), humidity, this.humidityLabel),
      h(
        'div',
        { class: 'field field-stack' },
        h('label', {}, '🚶 Motion sensor (แยกห้อง)'),
        ...motionRows,
        h('div', { class: 'row' }, leaveHome),
        h('div', { class: 'row' }, h('span', { class: 'hint' }, 'ออกจากห้องแล้วรอ'), roomDelay, h('span', { class: 'hint' }, 'วินาที → ปิดไฟ แอร์ ทีวีของห้องนั้น')),
        h('div', { class: 'row' }, h('span', { class: 'hint' }, 'ไม่มีคนทั้งบ้านเกิน'), timeout, h('span', { class: 'hint' }, 'วินาที → ปิดไฟ ทีวี แอร์')),
        this.countdown,
      ),
      h(
        'div',
        { class: 'field field-stack' },
        h('label', {}, '📷 กล้องป้ายทะเบียน'),
        h('div', { class: 'row' }, this.plateInput, h('button', { class: 'btn', onclick: sendCar }, '🚗 รถมาถึง')),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'chip', onclick: () => this.sendPlate(system.plates.list()[0] ?? '') }, 'รถเจ้าของบ้าน'),
          h(
            'button',
            {
              class: 'chip',
              onclick: () => this.sendPlate(STRANGER_PLATES[Math.floor(Math.random() * STRANGER_PLATES.length)]),
            },
            'รถแปลกหน้า',
          ),
        ),
      ),
    );
    this.refresh();
  }

  private sendPlate(plate: string): void {
    this.plateInput.value = plate;
    this.system.sensors.plateCamera.detect(plate);
  }

  refresh(): void {
    const { sensors, rules } = this.system;
    const period = rules.sunlight.period === 'night' ? '🌙 กลางคืน' : '☀️ กลางวัน';
    setText(this.sunlightLabel, `${sensors.sunlight.getValue()}% · ${period}`);
    setText(
      this.humidityLabel,
      `${sensors.humidity.getValue()}% · ${sensors.humidity.isRaining ? '🌧️ ฝนตก' : 'ไม่มีฝน'}`,
    );

    for (const { room, button } of this.motionButtons) {
      const detected = sensors.motion[room].getValue();
      const offIn = rules.roomPresence.pendingOffMs(room);
      const countdown = offIn === null ? '' : ` ⏳ ปิดใน ${Math.ceil(offIn / 1000)} วิ`;
      setText(button, `${detected ? '🟢' : '⚪'} ${ROOM_LABELS[room]}: ${detected ? 'มีคน' : 'ไม่มีคน'}${countdown}`);
      button.classList.toggle('is-on', detected);
    }

    const remaining = rules.noMotion.remainingMs;
    setText(
      this.countdown,
      remaining === null ? '' : remaining > 0 ? `⏳ จะปิดไฟ ทีวี แอร์ ใน ${Math.ceil(remaining / 1000)} วินาที` : '✅ ปิดอุปกรณ์แล้ว',
    );
  }
}
