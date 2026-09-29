import type { PlateRepository } from '../access/PlateRepository';
import { h } from './dom';

/** Manage the licence plates that are allowed through the gate. */
export class PlatePanel {
  private readonly list: HTMLUListElement;
  private readonly input: HTMLInputElement;

  constructor(
    root: HTMLElement,
    private readonly plates: PlateRepository,
  ) {
    this.list = h('ul', { class: 'plate-list' });
    this.input = h('input', { type: 'text', placeholder: 'ป้ายทะเบียนใหม่', class: 'text' });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.add();
    });

    root.append(
      h('h2', {}, 'ป้ายทะเบียนที่อนุญาต'),
      this.list,
      h('div', { class: 'row' }, this.input, h('button', { class: 'btn', onclick: () => this.add() }, '+ เพิ่ม')),
    );
    this.render();
  }

  private add(): void {
    if (this.plates.add(this.input.value)) this.input.value = '';
    this.render();
  }

  private render(): void {
    this.list.replaceChildren(
      ...this.plates.list().map((plate) =>
        h(
          'li',
          {},
          h('span', { class: 'plate' }, plate),
          h(
            'button',
            {
              class: 'btn btn-small btn-ghost',
              'aria-label': `ลบป้าย ${plate}`,
              onclick: () => {
                this.plates.remove(plate);
                this.render();
              },
            },
            '✕',
          ),
        ),
      ),
    );
  }
}
