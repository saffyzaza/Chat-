# คู่มือการใช้งานระบบส่งไฟล์ไปยัง API ภายนอก

## การตั้งค่า

### 1. กำหนด URL ของ API ภายนอก
เปิดไฟล์ `app/admin/page.tsx` และแก้ไขบรรทัดนี้:

```typescript
const externalApiUrl = 'http://72.61.120.205:8001/upload'; // ใส่ URL ของ API ที่ต้องการ
```

### 2. ข้อมูลที่จะส่งไปยัง API ภายนอก

ระบบจะส่ง FormData ที่มีข้อมูลดังนี้:

- `files`: ไฟล์ที่ถูกอัปโหลด (Blob) - **key สำหรับไฟล์คือ "files"**
- `filename`: ชื่อไฟล์ เช่น "document.pdf"
- `path`: path ของโฟลเดอร์ที่เก็บไฟล์ เช่น "/" หรือ "/documents/"
- `size`: ขนาดไฟล์ (bytes) เช่น "1024000"
- `type`: MIME type ของไฟล์ เช่น "application/pdf"

### 3. ตัวอย่าง API ภายนอก (Node.js/Express)

```javascript
const express = require('express');
const multer = require('multer');
const app = express();

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('files'), (req, res) => {  // key คือ 'files'
  const { filename, path, size, type } = req.body;
  const file = req.file;

  console.log('Received file:', {
    originalName: filename,
    storedPath: file.path,
    size: size,
    mimeType: type,
    uploadPath: path
  });

  // ประมวลผลไฟล์ตามต้องการ
  
  res.json({
    success: true,
    message: 'File uploaded successfully',
    fileId: 'unique-file-id',
    data: {
      filename: filename,
      url: `https://your-cdn.com/files/${file.filename}`
    }
  });
});

app.listen(3001, () => {
  console.log('External API running on port 3001');
});
```

### 4. การตรวจสอบผลลัพธ์

ผลลัพธ์จาก API ภายนอกจะถูกส่งกลับมาใน response:

```json
{
  "success": true,
  "filename": "example.pdf",
  "path": "/documents/",
  "externalApi": {
    "success": true,
    "data": {
      "success": true,
      "message": "File uploaded successfully",
      "fileId": "unique-file-id",
      "data": {
        "filename": "example.pdf",
        "url": "https://your-cdn.com/files/abc123.pdf"
      }
    }
  }
}
```

### 5. การดู Log

เปิด Browser Console เพื่อดูผลลัพธ์:
```
External API Response: { success: true, message: "File uploaded successfully", ... }
```

## หมายเหตุ

- ถ้า `externalApiUrl` เป็นค่าว่าง (`''`) ไฟล์จะถูกบันทึกเฉพาะในเซิร์ฟเวอร์ local เท่านั้น
- หาก API ภายนอกล้มเหลว ระบบจะยังคงบันทึกไฟล์ใน local และไม่ throw error
- ระบบรองรับการอัปโหลดพร้อมกันหลายไฟล์
- รองรับทั้งการอัปโหลดผ่าน modal และ drag-and-drop

## ความปลอดภัย

แนะนำให้เพิ่มการตรวจสอบ:
1. API Key หรือ Authentication Token
2. File type validation
3. File size limit
4. CORS configuration สำหรับ API ภายนอก

```typescript
// ตัวอย่างการเพิ่ม API Key
const externalFormData = new FormData();
externalFormData.append('files', new Blob([buffer]), file.name);  // key คือ 'files'
externalFormData.append('apiKey', 'your-secret-api-key');
```
