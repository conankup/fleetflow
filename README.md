# FleetFlow – ระบบจัดตารางรถยนต์และคนขับ

## 📖 ภาพรวมโครงการ
FleetFlow เป็นระบบจัดการตารางการใช้รถยนต์สำหรับองค์กรที่ต้องการจัดสรรรถและคนขับให้เหมาะสมกับงาน (เช่น งานธนาคาร, งานส่งเอกสาร, งานรับวิทยากร ฯลฯ) โดยมีคุณสมบัติสำคัญ:
- **การบันทึกข้อมูลยานพาหนะ** (ทะเบียน, ยี่ห้อ, ประเภท, จำนวนที่นั่ง, สถานะ ฯลฯ)
- **การจัดการข้อมูลคนขับ** พร้อมการคำนวณความเท่าเทียมโดยใช้จำนวนครั้งที่ออกต่างจังหวัดทั้งหมด
- **ระบบอนุมัติอัตโนมัติ** สำหรับงานประจำ พร้อมการปรับแก้ไขเมื่องานด่วนหรือมีการเปลี่ยนแปลง
- **แผนที่การแก้ไขวันอาทิตย์** – หากวันทำการเป็นวันอาทิตย์ ระบบจะให้ความสำคัญกับคนขับที่ทำงานวันเสาร์ก่อนหน้า
- **UI สไตล์ Premium Dark‑Theme + Glassmorphism** ทำให้ดูสวยงามและตอบสนองดีบนอุปกรณ์ทุกขนาด
- **Export รายงานเป็น CSV** (พร้อม UTF‑8 BOM เพื่อความเข้ากันได้กับ Excel)

## 🛠️ เทคโนโลยีที่ใช้
- **Frontend**: HTML5, CSS3 (custom design system), JavaScript (vanilla) – SPA ที่โหลดมุมมองแบบไดนามิกผ่าน `app.js`
- **Backend**: PHP 8.x, PDO MySQL – API ไฟล์ `api.php` ทำหน้าที่เป็น router สำหรับทุก endpoint
- **Database**: MySQL – ฐานข้อมูลที่สร้างโดยสคริปต์ `setup_db.php`
- **Version Control**: Git (hosted บน GitHub) – URL: https://github.com/conankup/fleetflow.git

## 🚀 เริ่มต้นใช้งาน (Local Development)
1. **Clone Repository**
   ```bash
   git clone https://github.com/conankup/fleetflow.git
   cd fleetflow
   ```
2. **ตั้งค่า Database**
   - สร้างฐานข้อมูล MySQL ชื่อ `fleetflow` (หรือชื่ออื่นตามต้องการ)
   - ตั้งค่าไฟล์ `db.php` ให้ตรงกับ `host`, `dbname`, `username`, `password`
   - รันสคริปต์ตั้งค่า schema และข้อมูลจำลอง:
     ```bash
     php setup_db.php
     ```
3. **รัน Web Server แบบ Local**
   ```bash
   php -S localhost:8000
   ```
   เปิดเบราว์เซอร์ที่ `http://localhost:8000` จะเห็นหน้า Dashboard ของ FleetFlow
4. **เข้าสู่ระบบ**
   - Username / Password เริ่มต้น (ตั้งค่าใน `setup_db.php`): `admin` / `admin123`
   - หลังจาก login สามารถเพิ่ม/แก้ไข ยานพาหนะ, คนขับ, งานประจำ ฯลฯ ได้ตามเมนู

## 📂 โครงสร้างโฟลเดอร์หลัก
```
fleetflow/
├─ index.php          # หน้าแรกของ SPA
├─ app.js             # JavaScript SPA router & API helper
├─ styles.css         # CSS design system (dark‑theme, glassmorphism)
├─ api.php            # Backend router – จัดการ CRUD, การคำนวณแผนงาน
├─ db.php             # การเชื่อมต่อ PDO ไปยัง MySQL
├─ setup_db.php       # สคริปต์สร้างตารางและข้อมูลตัวอย่าง
├─ .gitignore         # ไฟล์ไม่ให้ Git ติดตาม
└─ README.md          # (นี่คือไฟล์ที่คุณกำลังอ่าน)
```

## 🧭 แนวทางการพัฒนา / Contribution
- **Branch Workflow**: สร้าง branch จาก `main` สำหรับแต่ละฟีเจอร์หรือบัก
  ```bash
  git checkout -b feature/your-feature-name
  ```
- **Commit Message**: ใช้ Conventional Commits (ex. `feat: เพิ่มฟีเจอร์การคัดกรองรถ`)
- **Pull Request**: เปิด PR ไปที่ `main` พร้อมคำอธิบายสั้น ๆ ของการเปลี่ยนแปลง
- **Testing**: ตรวจสอบการทำงานของ API ด้วย Postman หรือ curl และ UI ด้วย Chrome DevTools

## 📄 License
เปิดใช้ภายใต้ **MIT License** – ดูไฟล์ `LICENSE` สำหรับรายละเอียดเพิ่มเติม

---
*อัปเดตล่าสุด: 2026‑05‑22*
