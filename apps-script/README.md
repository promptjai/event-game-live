# Registration → Players sync (PDPA consent fix)

## ปัญหา / The problem

ผู้เล่นลงทะเบียนผ่าน Google Form (https://forms.gle/cCB6q1jJYThzq9ad6) และติ๊กยินยอม PDPA แล้ว
แต่คอลัมน์ **PDPA Consent (Y)** ในแท็บ **Players** ยังว่างอยู่

สาเหตุ: Google Form ไม่เคยเขียนลงแท็บ Players โดยตรง — คำตอบทั้งหมด (รวมทั้ง PDPA)
ถูกบันทึกลงแท็บของฟอร์มเอง (**Form Responses 1** / **การตอบแบบฟอร์ม 1**)
ต้องมีสคริปต์คอยคัดลอกข้อมูลจากฟอร์มเข้าแท็บ Players ซึ่งของเดิมคัดลอกเฉพาะชื่อผู้เล่น
แต่ไม่ได้คัดลอกช่องยินยอม PDPA

## วิธีติดตั้ง / Install (one time)

1. เปิดสเปรดชีต → **Extensions → Apps Script**
2. วางโค้ดทั้งไฟล์ [`registration-sync.gs`](registration-sync.gs) ลงใน `Code.gs` แล้วกด Save
3. เมนูซ้าย → **Triggers** (รูปนาฬิกา) → **Add Trigger** ตั้งค่า:
   - Function: `onFormSubmit`
   - Event source: **From spreadsheet**
   - Event type: **On form submit**
4. กด Save แล้วอนุญาตสิทธิ์ (permissions) ตามที่ Google ถาม
5. **Backfill คนที่ลงทะเบียนไปแล้ว:** ในหน้า Apps Script เลือกฟังก์ชัน
   `backfillFromFormResponses` แล้วกด **Run** หนึ่งครั้ง —
   สคริปต์จะไล่อ่านคำตอบเก่าทั้งหมดในแท็บ Form Responses แล้วเติมค่า Y/N ให้

## สิ่งที่สคริปต์ทำ / What it does

ทุกครั้งที่มีคนส่งฟอร์ม:

- หาแถวของผู้เล่นในแท็บ Players จาก **Player tag** (ถ้ายังไม่มีจะใช้แถวว่างแถวแรก)
- เขียน **Y/N** ลงคอลัมน์ **PDPA Consent** และ **Photo Consent**
  (คำตอบภาษาไทยเช่น "ยินยอม" / "ไม่ยินยอม" ก็แปลงเป็น Y/N ให้)
- หา column จากข้อความหัวตาราง ไม่ใช่ตำแหน่งตายตัว — แทรก/สลับคอลัมน์ได้ไม่พัง

ถ้าเปลี่ยนชื่อคำถามในฟอร์ม หรือเปลี่ยนหัวคอลัมน์ในแท็บ Players
ให้ปรับรายการ `FORM_QUESTIONS` / `PLAYERS_COLS` ที่หัวไฟล์สคริปต์
