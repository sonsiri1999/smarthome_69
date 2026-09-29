# Pixel Smart Home

Mini project วิชา Pattern and Software Design: ระบบบ้านอัจฉริยะจำลอง (TypeScript + Vite + Canvas) ที่มีหน้าจอบ้าน 2D แบบพิกเซล

รายงานเต็ม (วัตถุประสงค์ ปัญหา pattern เหตุผล และ UML) อยู่ที่ [docs/report.md](docs/report.md)

## วิธีรัน

ต้องมี Node.js 18 ขึ้นไป

```bash
npm install
npm run dev      # เปิด http://localhost:5173
npm test         # รัน unit test
npm run build    # สร้างไฟล์สำหรับ deploy ใน dist/
```

## ลองใช้งาน

| ทำอะไร | ผลที่ได้ |
|---|---|
| เลื่อน **แสงแดด** ต่ำกว่า 30% | กลางคืน: ไฟรั้วเปิด ผ้าม่านเลื่อนขึ้น (UC2, UC3) |
| เลื่อน **ความชื้น** เกิน 85% | ฝนตก: ม่านลง ไฟรั้วเปิด แจ้งเตือนเก็บผ้า (UC4) |
| กด **รถเจ้าของบ้าน** | ประตูรั้วเปิด รถเข้าบ้าน แอร์และไฟห้องนั่งเล่นเปิด แล้วประตูปิดเอง (UC1, UC5) |
| กด **รถแปลกหน้า** | ประตูไม่เปิด และมีคำเตือนใน log |
| กด **เดินไปห้องนี้** ที่ห้องนอน แล้วกดที่ห้องนั่งเล่น | ไฟ/แอร์ตามคนไป: ห้องที่คนอยู่เปิดทันที ห้องที่ไม่มีคนปิดไฟ แอร์ ทีวีหลังหน่วงเวลา 5 วินาที (UC7) |
| กด **ทุกคนออกจากบ้าน** | ครบเวลาแล้วไฟ ทีวี และแอร์จะปิด (UC6) |
| คลิกอุปกรณ์ในภาพ หรือกดปุ่มในแผงควบคุม | เปิด/ปิดแบบ manual และกด Undo ย้อนกลับได้ |

## โครงสร้าง

```
src/
  core/        SmartHome (Singleton), createHomeSystem (ประกอบระบบ)
  devices/     Device + อุปกรณ์แต่ละชนิด, DeviceFactory, gate/ (State pattern)
  sensors/     Sensor (Observer: Subject) + เซ็นเซอร์จำลอง 4 ตัว
  automation/  กฎอัตโนมัติ (Observer: Observer) สำหรับ UC1–UC6
  commands/    Command pattern + CommandInvoker (undo, log)
  access/      Chain of Responsibility สำหรับตรวจป้ายทะเบียน + PlateRepository
  ui/          PixelHouseRenderer (Canvas), แผงควบคุมต่าง ๆ
tests/         Vitest
```
