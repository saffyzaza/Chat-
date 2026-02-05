# โครงสร้างตาราง accident (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS accident (
  id SERIAL PRIMARY KEY,
  ปีที่เกิดเหตุ INTEGER,
  วันที่เกิดเหตุ VARCHAR(50),
  เวลา VARCHAR(50),
  วันที่รายงาน VARCHAR(50),
  เวลาที่รายงาน VARCHAR(50),
  ACC_CODE BIGINT,
  หน่วยงาน VARCHAR(100),
  สายทางหน่วยงาน VARCHAR(100),
  รหัสสายทาง VARCHAR(50),
  สายทาง TEXT,
  KM DOUBLE PRECISION,
  จังหวัด VARCHAR(100),
  รถคันที่1 TEXT,
  บริเวณที่เกิดเหตุ TEXT,
  มูลเหตุสันนิษฐาน TEXT,
  ลักษณะการเกิดเหตุ TEXT,
  สภาพอากาศ VARCHAR(100),
  LATITUDE DOUBLE PRECISION,
  LONGITUDE DOUBLE PRECISION,
  รถที่เกิดเหตุ INTEGER,
  รถและคนที่เกิดเหตุ INTEGER,
  รถจักรยานยนต์ INTEGER,
  รถสามล้อเครื่อง INTEGER,
  รถยนต์นั่งส่วนบุคคล INTEGER,
  รถตู้ INTEGER,
  รถปิคอัพโดยสาร INTEGER,
  รถโดยสารมากกว่า4ล้อ INTEGER,
  รถปิคอัพบรรทุก4ล้อ INTEGER,
  รถบรรทุก6ล้อ INTEGER,
  รถบรรทุกไม่เกิน10ล้อ INTEGER,
  รถบรรทุกมากกว่า10ล้อ INTEGER,
  รถอีแต๋น INTEGER,
  รถอื่นๆ INTEGER,
  คนเดินเท้า INTEGER,
  ผู้เสียชีวิต INTEGER,
  ผู้บาดเจ็บสาหัส INTEGER,
  ผู้บาดเจ็บเล็กน้อย INTEGER,
  รวมจำนวนผู้บาดเจ็บ INTEGER
);
```

## หมายเหตุ
- ตารางนี้เก็บข้อมูลอุบัติเหตุจากกรมทางหลวง
- มีข้อมูลพิกัด (LATITUDE, LONGITUDE) สำหรับแสดงบนแผนที่
- มีรายละเอียดประเภทยานพาหนะแยกตามชนิด (รถจักรยานยนต์, รถยนต์, รถบรรทุก, ฯลฯ)
- มีสถิติผู้ประสบภัย (เสียชีวิต, บาดเจ็บสาหัส, บาดเจ็บเล็กน้อย)
