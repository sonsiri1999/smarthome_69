import './style.css';
import { MemoryStore, type KeyValueStore } from './access/PlateRepository';
import { createToggleCommand } from './commands/createToggleCommand';
import { createHomeSystem } from './core/createHomeSystem';
import { MANUAL } from './core/SmartHome';
import { ControlPanel } from './ui/ControlPanel';
import { LogPanel } from './ui/LogPanel';
import { PixelHouseRenderer } from './ui/PixelHouseRenderer';
import { PlatePanel } from './ui/PlatePanel';
import { SensorPanel } from './ui/SensorPanel';

function browserStore(): KeyValueStore {
  try {
    const probe = '__probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return new MemoryStore();
  }
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const system = createHomeSystem(browserStore());
const { home, sensors, rules } = system;

const canvas = byId<HTMLCanvasElement>('house');
const hoverInfo = byId('hover-info');
const renderer = new PixelHouseRenderer(canvas, system);
const controlPanel = new ControlPanel(byId('controls'), system);
const sensorPanel = new SensorPanel(byId('sensors'), system);
new PlatePanel(byId('plates'), system.plates);
new LogPanel(byId('log'), home, byId('toasts'));

// car animation follows the result of the access chain
rules.carArrival.onResult = (_plate, result) => renderer.car.arrive(result.granted);
renderer.car.onParked = () => {
  home.log('SYSTEM', 'ผู้อยู่อาศัยลงจากรถและเดินเข้าห้องนั่งเล่น');
  sensors.motion.living.setValue(true);
};

// click a device in the picture to toggle it
canvas.addEventListener('click', (e) => {
  const id = renderer.deviceAt(e.clientX, e.clientY);
  const device = id ? home.findDevice(id) : undefined;
  if (device) home.run(createToggleCommand(device), MANUAL);
});

let hoverId: string | null = null;
canvas.addEventListener('mousemove', (e) => {
  hoverId = renderer.deviceAt(e.clientX, e.clientY);
  renderer.setHover(hoverId);
  canvas.style.cursor = hoverId ? 'pointer' : 'default';
});
canvas.addEventListener('mouseleave', () => {
  hoverId = null;
  renderer.setHover(null);
});

// Home logic (gate, curtains, rule timers) runs on its own clock so countdowns keep
// going while the tab is in the background, when requestAnimationFrame is paused.
const LOGIC_TICK_MS = 100;
let lastLogic = performance.now();
setInterval(() => {
  const now = performance.now();
  // background tabs may only tick about once per second; cap longer gaps (e.g. sleep)
  home.update(Math.min(1000, now - lastLogic));
  lastLogic = now;
}, LOGIC_TICK_MS);

// drawing and the panels follow the screen refresh
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, now - last);
  last = now;
  renderer.update(dt);
  renderer.draw();
  controlPanel.refresh();
  sensorPanel.refresh();

  const device = hoverId ? home.findDevice(hoverId) : undefined;
  const text = device ? `${device.name}: ${device.statusText} — คลิกเพื่อสลับ` : 'คลิกที่อุปกรณ์ในภาพเพื่อเปิด/ปิด';
  if (hoverInfo.textContent !== text) hoverInfo.textContent = text;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
