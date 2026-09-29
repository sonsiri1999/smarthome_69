import { createToggleCommand } from '../commands/createToggleCommand';
import type { HomeSystem } from '../core/createHomeSystem';
import { MANUAL } from '../core/SmartHome';
import type { Device, Zone } from '../devices/Device';
import { h, setText } from './dom';

const ZONE_LABELS: Record<Zone, string> = {
  living: '🛋️ ห้องนั่งเล่น',
  kitchen: '🍳 ห้องครัว',
  bedroom: '🛏️ ห้องนอน',
  outdoor: '🏡 นอกบ้าน',
};

interface Row {
  device: Device;
  row: HTMLElement;
  status: HTMLElement;
  button: HTMLButtonElement;
}

/** Manual on/off buttons for every device, plus undo. */
export class ControlPanel {
  private readonly rows: Row[] = [];
  private readonly undoButton: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    private readonly system: HomeSystem,
  ) {
    const { home } = system;
    this.undoButton = h(
      'button',
      { class: 'btn btn-small', onclick: () => home.undo(), title: 'ย้อนกลับคำสั่ง manual ล่าสุด' },
      '↶ Undo',
    );
    root.append(h('div', { class: 'panel-head' }, h('h2', {}, 'ควบคุมอุปกรณ์ (Manual)'), this.undoButton));

    for (const zone of Object.keys(ZONE_LABELS) as Zone[]) {
      const devices = home.allDevices.filter((d) => d.zone === zone);
      if (devices.length === 0) continue;
      const list = h('ul', { class: 'device-list' });
      for (const device of devices) {
        const status = h('span', { class: 'device-status' });
        const button = h('button', {
          class: 'btn btn-toggle',
          onclick: () => home.run(createToggleCommand(device), MANUAL),
        });
        const row = h('li', { class: 'device-row' }, h('span', { class: 'device-name' }, device.name), status, button);
        list.append(row);
        this.rows.push({ device, row, status, button });
      }
      root.append(h('h3', {}, ZONE_LABELS[zone]), list);
    }
    this.refresh();
  }

  refresh(): void {
    for (const { device, row, status, button } of this.rows) {
      setText(status, device.statusText);
      setText(button, device.isOn ? 'ปิด' : 'เปิด');
      button.setAttribute('aria-label', `${device.isOn ? 'ปิด' : 'เปิด'} ${device.name}`);
      row.classList.toggle('is-on', device.isOn);
    }
    this.undoButton.disabled = !this.system.home.invoker.canUndo;
  }
}
