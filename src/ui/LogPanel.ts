import type { LogEntry, SmartHome } from '../core/SmartHome';
import { h } from './dom';

const MAX_ROWS = 120;

function sourceClass(source: string): string {
  if (source === 'MANUAL') return 'src-manual';
  if (source.startsWith('AUTO:')) return 'src-auto';
  if (source === 'DEVICE') return 'src-device';
  return 'src-system';
}

/** Activity log (newest first) and pop-up toasts for alerts. */
export class LogPanel {
  private readonly list: HTMLOListElement;

  constructor(
    root: HTMLElement,
    home: SmartHome,
    private readonly toastRoot: HTMLElement,
  ) {
    this.list = h('ol', { class: 'log-list' });
    root.append(h('h2', {}, 'บันทึกการทำงาน (Command log)'), this.list);

    for (const entry of home.logs) this.add(entry);
    home.onLog((entry) => this.add(entry));
    home.onAlert((entry) => this.toast(entry.message));
  }

  private add(entry: LogEntry): void {
    const time = entry.time.toLocaleTimeString('th-TH', { hour12: false });
    const row = h(
      'li',
      { class: `log-row level-${entry.level}` },
      h('time', {}, time),
      h('span', { class: `src ${sourceClass(entry.source)}` }, entry.source),
      h('span', { class: 'msg' }, entry.message),
    );
    this.list.prepend(row);
    while (this.list.children.length > MAX_ROWS) this.list.lastElementChild?.remove();
  }

  private toast(message: string): void {
    const el = h('div', { class: 'toast', role: 'alert' }, message);
    this.toastRoot.append(el);
    setTimeout(() => el.classList.add('hide'), 4500);
    setTimeout(() => el.remove(), 5000);
  }
}
