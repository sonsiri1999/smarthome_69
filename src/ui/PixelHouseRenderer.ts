import type { HomeSystem } from '../core/createHomeSystem';
import { AirConditioner } from '../devices/AirConditioner';
import { Curtain } from '../devices/Curtain';
import { ROOM_ZONES, type Device, type Room } from '../devices/Device';
import { FenceLight } from '../devices/FenceLight';
import { Fridge } from '../devices/Fridge';
import { Light } from '../devices/Light';
import { TV } from '../devices/TV';
import { CarAnimator } from './CarAnimator';

export const SCENE_W = 320;
export const SCENE_H = 180;
const GROUND_Y = 150;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RoomLayout {
  lightId: string;
  area: Rect;
  wall: string;
  window: Rect;
  curtainId: string;
  curtainColor: string;
  lampX: number;
}

const ROOMS: RoomLayout[] = [
  {
    lightId: 'light-living',
    area: { x: 143, y: 63, w: 78, h: 83 },
    wall: '#cbb993',
    window: { x: 186, y: 74, w: 28, h: 24 },
    curtainId: 'curtain-living',
    curtainColor: '#c0504d',
    lampX: 177,
  },
  {
    lightId: 'light-kitchen',
    area: { x: 224, y: 63, w: 41, h: 83 },
    wall: '#a9c6b1',
    window: { x: 230, y: 76, w: 28, h: 20 },
    curtainId: 'curtain-kitchen',
    curtainColor: '#e0a030',
    lampX: 244,
  },
  {
    lightId: 'light-bedroom',
    area: { x: 268, y: 63, w: 45, h: 83 },
    wall: '#b8aacb',
    window: { x: 272, y: 78, w: 26, h: 22 },
    curtainId: 'curtain-bedroom',
    curtainColor: '#4f6fb3',
    lampX: 281,
  },
];

const AIRCON_RECTS: Record<string, Rect> = {
  'aircon-living': { x: 146, y: 65, w: 22, h: 6 },
  'aircon-bedroom': { x: 291, y: 65, w: 20, h: 6 },
};

const FENCE_POSTS_X = [150, 230, 306];

/** x range each room's resident walks back and forth in. */
const PERSON_WALK: Record<Room, [number, number]> = {
  living: [188, 210],
  kitchen: [228, 242],
  bedroom: [284, 304],
};

/** Where the user can click. Checked in order, so small devices come before whole rooms. */
const HIT_AREAS: Array<Rect & { id: string }> = [
  { id: 'tv-living', x: 146, y: 116, w: 30, h: 30 },
  { id: 'aircon-living', x: 145, y: 63, w: 25, h: 11 },
  { id: 'aircon-bedroom', x: 290, y: 63, w: 23, h: 11 },
  { id: 'curtain-living', x: 184, y: 70, w: 32, h: 30 },
  { id: 'curtain-kitchen', x: 228, y: 72, w: 32, h: 26 },
  { id: 'curtain-bedroom', x: 270, y: 74, w: 30, h: 28 },
  { id: 'fridge-kitchen', x: 249, y: 100, w: 16, h: 46 },
  { id: 'fence-gate', x: 72, y: 94, w: 28, h: 10 },
  { id: 'gate-front', x: 74, y: 104, w: 24, h: 62 },
  { id: 'fence-front', x: 98, y: 144, w: 222, h: 36 },
  ...ROOMS.map((r) => ({ id: r.lightId, ...r.area })),
];

interface Drop {
  x: number;
  y: number;
  speed: number;
}

/** Deterministic pseudo-random numbers so the stars stay in place between frames. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(ar + (br - ar) * k)},${Math.round(ag + (bg - ag) * k)},${Math.round(ab + (bb - ab) * k)})`;
}

/** Draws the whole house as 2D pixel art from the current state of the devices and sensors. */
export class PixelHouseRenderer {
  readonly car = new CarAnimator();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stars: Array<{ x: number; y: number; phase: number }>;
  private readonly drops: Drop[];
  private hoverId: string | null = null;
  private time = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly system: HomeSystem,
  ) {
    canvas.width = SCENE_W;
    canvas.height = SCENE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;

    const rand = seeded(7);
    this.stars = Array.from({ length: 40 }, () => ({
      x: Math.floor(rand() * SCENE_W),
      y: Math.floor(rand() * 90),
      phase: rand() * Math.PI * 2,
    }));
    this.drops = Array.from({ length: 90 }, () => ({
      x: rand() * SCENE_W,
      y: rand() * SCENE_H,
      speed: 0.18 + rand() * 0.08,
    }));
  }

  /** Id of the device under a mouse position given in client (page) coordinates. */
  deviceAt(clientX: number, clientY: number): string | null {
    const box = this.canvas.getBoundingClientRect();
    const x = ((clientX - box.left) * SCENE_W) / box.width;
    const y = ((clientY - box.top) * SCENE_H) / box.height;
    const hit = HIT_AREAS.find((a) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
    return hit?.id ?? null;
  }

  setHover(id: string | null): void {
    this.hoverId = id;
  }

  update(dtMs: number): void {
    this.time += dtMs;
    this.car.update(dtMs, this.system.gate.position >= 0.95);
    if (this.system.sensors.humidity.isRaining) {
      for (const d of this.drops) {
        d.y += d.speed * dtMs;
        d.x -= d.speed * dtMs * 0.25;
        if (d.y > SCENE_H) {
          d.y = -Math.random() * 20;
          d.x = Math.random() * (SCENE_W + 40);
        }
      }
    }
  }

  draw(): void {
    this.drawSky();
    this.drawGround();
    this.drawHouse();
    this.drawRain();
    this.drawCar();
    this.drawGate();
    this.drawFrontFence();
    this.drawHover();
  }

  // ---------------------------------------------------------------- helpers

  private rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  private glow(cx: number, cy: number, radius: number, rgb: string, strength: number): void {
    const ctx = this.ctx;
    for (let r = radius; r > 0; r -= 3) {
      ctx.fillStyle = `rgba(${rgb},${(strength * (1 - r / radius) * 0.5).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private device<T extends Device>(id: string, cls: abstract new (...args: never[]) => T): T {
    return this.system.home.getDevice(id, cls);
  }

  private get daylight(): number {
    return this.system.sensors.sunlight.getValue() / 100;
  }

  private get raining(): boolean {
    return this.system.sensors.humidity.isRaining;
  }

  private skyColor(): string {
    const base = mix('#0b1030', '#6ec6f0', this.daylight);
    if (!this.raining) return base;
    const [r, g, b] = base.match(/\d+/g)!.map(Number);
    const grey = hexToRgb('#56606e');
    const k = 0.55;
    return `rgb(${Math.round(r + (grey[0] - r) * k)},${Math.round(g + (grey[1] - g) * k)},${Math.round(b + (grey[2] - b) * k)})`;
  }

  // ---------------------------------------------------------------- scene

  private drawSky(): void {
    this.rect(0, 0, SCENE_W, GROUND_Y, this.skyColor());
    const t = this.daylight;

    if (t < 0.35 && !this.raining) {
      for (const s of this.stars) {
        const twinkle = Math.sin(this.time / 400 + s.phase) > 0.2;
        this.rect(s.x, s.y, 1, 1, twinkle ? '#ffffff' : '#8890b0');
      }
    }

    if (t >= 0.35) {
      const sunY = 46 - t * 26;
      this.glow(40, sunY + 5, 16, '255,230,120', this.raining ? 0.3 : 0.8);
      this.rect(35, sunY, 10, 10, this.raining ? '#d8d0a0' : '#ffe066');
      this.rect(37, sunY - 1, 6, 12, this.raining ? '#d8d0a0' : '#ffe066');
    } else if (!this.raining) {
      this.rect(36, 18, 8, 8, '#f4f1d0');
      this.rect(39, 18, 5, 5, this.skyColor());
    }

    const cloudCount = this.raining ? 5 : 3;
    const cloudColor = this.raining ? '#6b7280' : '#f1f5f9';
    for (let i = 0; i < cloudCount; i++) {
      const x = ((i * 83 + this.time * 0.004 * (1 + i * 0.3)) % (SCENE_W + 60)) - 50;
      const y = 10 + ((i * 17) % 26);
      this.rect(x, y + 4, 36, 7, cloudColor);
      this.rect(x + 6, y, 16, 6, cloudColor);
      this.rect(x + 18, y + 2, 12, 4, cloudColor);
    }
  }

  private drawGround(): void {
    const dark = 1 - this.daylight;
    this.rect(0, GROUND_Y, 76, SCENE_H - GROUND_Y, mix('#4a4a56', '#1c1c24', dark));
    for (let x = 4; x < 76; x += 14) this.rect(x, 172, 7, 1, '#d9d27a');
    this.rect(76, GROUND_Y, SCENE_W - 76, SCENE_H - GROUND_Y, mix('#5aa845', '#1f3d1b', dark));
    this.rect(76, GROUND_Y, 64, 16, mix('#9d9d9d', '#3a3a40', dark));
  }

  private drawHouse(): void {
    // chimney first so the roof covers its base
    this.rect(280, 34, 10, 18, '#8a5a44');
    this.rect(278, 32, 14, 3, '#6d4535');
    for (let i = 0; i <= 30; i++) {
      const hw = 8 + i * 3;
      this.rect(228 - hw, 30 + i, hw * 2, 1, i % 4 === 3 ? '#7e2f28' : '#a4413a');
    }
    this.rect(140, 60, 176, 90, '#e9dcc0');
    this.rect(140, 146, 176, 4, '#6b4a2e');

    for (const room of ROOMS) this.drawRoom(room);
    this.drawLivingRoomItems();
    this.drawKitchenItems();
    this.drawBedroomItems();
    for (const room of ROOM_ZONES) {
      if (this.system.sensors.motion[room].getValue()) this.drawPerson(PERSON_WALK[room]);
    }

    for (const room of ROOMS) this.drawRoomLighting(room);
    this.drawEmissive();
  }

  private drawRoom(room: RoomLayout): void {
    const { area, window: w } = room;
    this.rect(area.x, area.y, area.w, area.h, room.wall);
    this.rect(area.x, area.y + area.h - 18, area.w, 1, 'rgba(0,0,0,0.12)');

    // window: shows the sky outside
    this.rect(w.x - 1, w.y - 1, w.w + 2, w.h + 2, '#f8f8f8');
    this.rect(w.x, w.y, w.w, w.h, this.skyColor());
    if (this.raining) {
      for (let i = 0; i < 6; i++) {
        const rx = w.x + ((i * 5 + Math.floor(this.time / 60)) % w.w);
        const ry = w.y + ((i * 7 + Math.floor(this.time / 40)) % (w.h - 3));
        this.rect(rx, ry, 1, 3, '#b8d4f0');
      }
    }
    this.rect(w.x + w.w / 2, w.y, 1, w.h, '#f8f8f8');
    this.rect(w.x, w.y + w.h / 2, w.w, 1, '#f8f8f8');

    // curtain rolls down from the rod
    const curtain = this.device(room.curtainId, Curtain);
    this.rect(w.x - 3, w.y - 3, w.w + 6, 2, '#5b4636');
    const drop = Math.round(curtain.position * (w.h + 2));
    if (drop > 0) {
      this.rect(w.x - 2, w.y - 1, w.w + 4, drop, room.curtainColor);
      for (let x = w.x; x < w.x + w.w + 2; x += 4) this.rect(x, w.y - 1, 1, drop, 'rgba(0,0,0,0.18)');
    }

    // hanging lamp
    this.rect(room.lampX, area.y, 1, 6, '#444');
    this.rect(room.lampX - 3, area.y + 6, 7, 3, '#3d3d3d');
  }

  private drawLivingRoomItems(): void {
    this.rect(146, 136, 30, 10, '#5a3d2b');
    this.rect(148, 118, 26, 17, '#1d1d22');
    this.rect(150, 120, 22, 13, '#2a2e36');
    // sofa
    this.rect(182, 128, 36, 8, '#b0413e');
    this.rect(182, 136, 36, 6, '#c9544f');
    this.rect(180, 130, 4, 14, '#963632');
    this.rect(216, 130, 4, 14, '#963632');
    this.rect(184, 142, 2, 4, '#3a2a20');
    this.rect(214, 142, 2, 4, '#3a2a20');
    this.drawAircon('aircon-living');
  }

  private drawKitchenItems(): void {
    this.rect(226, 126, 22, 20, '#8d6e57');
    this.rect(225, 124, 24, 2, '#d8d8d8');
    this.rect(229, 130, 7, 12, '#7a5c47');
    this.rect(238, 130, 7, 12, '#7a5c47');
    this.rect(250, 102, 13, 44, '#e3eaee');
    this.rect(250, 118, 13, 1, '#aab4ba');
    this.rect(251, 106, 1, 8, '#8a949a');
    this.rect(251, 122, 1, 10, '#8a949a');
  }

  private drawBedroomItems(): void {
    this.rect(270, 138, 40, 8, '#6b4a2e');
    this.rect(270, 132, 40, 6, '#f2f2f2');
    this.rect(282, 131, 28, 8, '#4a6fb5');
    this.rect(272, 129, 8, 4, '#ffffff');
    this.rect(270, 126, 3, 20, '#5a3d24');
    this.drawAircon('aircon-bedroom');
  }

  private drawAircon(id: string): void {
    const r = AIRCON_RECTS[id];
    this.rect(r.x, r.y, r.w, r.h, '#f4f6f8');
    this.rect(r.x, r.y + r.h - 2, r.w, 1, '#b8c0c8');
  }

  private drawPerson([from, to]: [number, number]): void {
    const px = Math.round(from + ((Math.sin(this.time / 1600) + 1) / 2) * (to - from));
    const step = Math.floor(this.time / 220) % 2;
    this.rect(px + 1, 125, 4, 4, '#f1c27d');
    this.rect(px + 1, 124, 4, 1, '#3b2a1a');
    this.rect(px, 129, 6, 9, '#2f7dd1');
    this.rect(px + (step ? 0 : 1), 138, 2, 8, '#2b2b3a');
    this.rect(px + (step ? 4 : 3), 138, 2, 8, '#2b2b3a');
  }

  private drawRoomLighting(room: RoomLayout): void {
    const light = this.device(room.lightId, Light);
    const { area } = room;
    if (light.isOn) {
      this.rect(area.x, area.y, area.w, area.h, 'rgba(255,214,120,0.12)');
      this.glow(room.lampX + 0.5, area.y + 10, 30, '255,220,130', 0.7);
    } else {
      const darkness = Math.min(1, 1 - this.daylight + (this.raining ? 0.2 : 0));
      this.rect(area.x, area.y, area.w, area.h, `rgba(8,10,30,${(0.08 + 0.62 * darkness).toFixed(3)})`);
    }
  }

  /** Things that glow are drawn after the room darkness so they stay visible at night. */
  private drawEmissive(): void {
    for (const room of ROOMS) {
      const on = this.device(room.lightId, Light).isOn;
      this.rect(room.lampX - 1, room.area.y + 9, 3, 2, on ? '#fff3b0' : '#6a6a6a');
    }

    if (this.device('tv-living', TV).isOn) {
      const palette = ['#3fa7ff', '#ff5f7e', '#6be07a', '#ffd84a', '#b889ff'];
      const frame = Math.floor(this.time / 160);
      for (let y = 0; y < 13; y += 3) {
        for (let x = 0; x < 22; x += 4) {
          this.rect(150 + x, 120 + y, 4, 3, palette[(x + y * 3 + frame) % palette.length]);
        }
      }
      this.glow(161, 127, 18, '140,190,255', 0.35);
    }

    for (const [id, r] of Object.entries(AIRCON_RECTS)) {
      const on = this.device(id, AirConditioner).isOn;
      this.rect(r.x + r.w - 3, r.y + 1, 2, 1, on ? '#3dff6e' : '#7a2020');
      if (on) {
        const wave = Math.floor(this.time / 150) % 4;
        for (let i = 0; i < 3; i++) {
          const x = r.x + 3 + i * 6;
          this.rect(x, r.y + r.h + 1 + wave, 1, 3, 'rgba(160,220,255,0.9)');
        }
      }
    }

    const fridge = this.device('fridge-kitchen', Fridge);
    this.rect(260, 105, 2, 1, fridge.isOn ? '#3dff6e' : '#7a2020');
  }

  private drawRain(): void {
    if (!this.raining) return;
    for (const d of this.drops) {
      const inHouse = d.x > 130 && d.x < 326 && d.y > 28 && d.y < GROUND_Y;
      if (!inHouse) this.rect(d.x, d.y, 1, 4, 'rgba(180,210,245,0.8)');
    }
  }

  private drawCar(): void {
    const car = this.car;
    if (car.phase === 'hidden') return;
    const x = Math.round(car.x);
    this.rect(x + 6, 146, 16, 6, '#c8323a');
    this.rect(x + 8, 147, 5, 4, '#9fd3ff');
    this.rect(x + 15, 147, 5, 4, '#9fd3ff');
    this.rect(x, 152, CarAnimator.WIDTH, 8, '#e03a44');
    this.rect(x + CarAnimator.WIDTH - 2, 154, 2, 2, '#fff6a0');
    this.rect(x, 154, 1, 2, '#ff4040');
    this.rect(x + 4, 159, 5, 5, '#1b1b1b');
    this.rect(x + 21, 159, 5, 5, '#1b1b1b');
    this.rect(x + 6, 161, 1, 1, '#888');
    this.rect(x + 23, 161, 1, 1, '#888');
    if (this.daylight < 0.35) this.glow(x + CarAnimator.WIDTH + 4, 155, 12, '255,250,190', 0.6);

    const blink = Math.floor(this.time / 250) % 2 === 0;
    if (car.phase === 'rejected' && blink) {
      // red X above the car
      for (let i = 0; i < 5; i++) {
        this.rect(x + 13 + i, 136 + i, 1, 1, '#ff3030');
        this.rect(x + 17 - i, 136 + i, 1, 1, '#ff3030');
      }
    }
    if (car.phase === 'waitGate') {
      for (let i = 0; i < 3; i++) this.rect(x + 11 + i * 3, 140, 2, 2, blink ? '#ffe066' : '#b0a040');
    }
  }

  private drawGate(): void {
    const gate = this.system.gate;
    const lampOn = this.device('fence-gate', FenceLight).isOn;
    const lift = Math.round(gate.position * 30);
    // bars of the gate panel, sliding up under the beam
    for (let x = 80; x < 92; x += 3) this.rect(x, 136 - lift, 2, 30, '#3f4650');
    this.rect(80, 140 - lift, 12, 2, '#565f6b');
    this.rect(80, 156 - lift, 12, 2, '#565f6b');

    this.rect(76, 104, 4, 62, '#9b8f80');
    this.rect(92, 104, 4, 62, '#9b8f80');
    this.rect(74, 102, 24, 4, '#7c7266');
    this.rect(76, 98, 4, 4, lampOn ? '#fff3a0' : '#555');
    this.rect(92, 98, 4, 4, lampOn ? '#fff3a0' : '#555');
    if (lampOn) {
      this.glow(78, 100, 16, '255,236,150', 0.8);
      this.glow(94, 100, 16, '255,236,150', 0.8);
    }
    // status light: green while open/moving, red when closed
    this.rect(85, 107, 2, 2, gate.isOn ? '#3dff6e' : '#ff4040');
  }

  private drawFrontFence(): void {
    const lampOn = this.device('fence-front', FenceLight).isOn;
    for (let x = 98; x < SCENE_W; x += 6) this.rect(x, 164, 2, 14, '#ece7dc');
    this.rect(96, 167, SCENE_W - 96, 2, '#d5cfc2');
    this.rect(96, 174, SCENE_W - 96, 2, '#d5cfc2');
    for (const px of FENCE_POSTS_X) {
      this.rect(px, 150, 3, 28, '#5f5a52');
      this.rect(px - 1, 146, 5, 4, lampOn ? '#fff3a0' : '#555');
      if (lampOn) this.glow(px + 1.5, 148, 20, '255,236,150', 0.8);
    }
  }

  private drawHover(): void {
    if (!this.hoverId) return;
    const area = HIT_AREAS.find((a) => a.id === this.hoverId);
    if (!area) return;
    const ctx = this.ctx;
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(area.x + 0.5, area.y + 0.5, area.w - 1, area.h - 1);
    ctx.setLineDash([]);
  }
}
