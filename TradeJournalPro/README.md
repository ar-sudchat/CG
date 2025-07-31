# Trade Journal Pro

Trade Journal Pro เป็นแอปพลิเคชันสำหรับนักลงทุน/เทรดเดอร์ เพื่อบันทึก วิเคราะห์ และปรับปรุงประสิทธิภาพการเทรดของคุณ รองรับทั้ง iOS/Android (React Native/Expo) และมีระบบ backend (Node.js/Express/MongoDB)

## คุณสมบัติหลัก
- Dashboard: ภาพรวมการเทรดล่าสุด, จำนวนบัญชี, Setup, ประวัติการเทรด
- บัญชีเทรด (Accounts): จัดการบัญชี ดูยอดคงเหลือ, P&L
- กฎการเทรด (Setups): สร้าง/แก้ไขกลยุทธ์ พร้อม Checklist
- ประวัติเทรด (History): ดู/ค้นหารายการเทรด
- บันทึกเทรดใหม่ (New Trade): ฟอร์มบันทึกเทรด, อัปโหลดรูปภาพ
- ธีมมืด/สว่าง, สลับภาษา (ไทย/อังกฤษ)
- กราฟ P&L, การอัปโหลดรูปภาพ, JWT Auth

## โครงสร้างโปรเจกต์

```
TradeJournalPro/
├── App.js
├── package.json
├── context/
│   └── AppContext.js
├── components/
│   ├── Card.js
│   └── Button.js
├── screens/
│   ├── MainScreen.js
│   ├── DashboardScreen.js
│   ├── AccountsScreen.js
│   ├── SetupsScreen.js
│   ├── HistoryScreen.js
│   ├── NewTradeScreen.js
│   └── Auth/
├── api/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── .env
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── package.json
└── ...
```

## การติดตั้งและใช้งาน

### 1. ติดตั้ง Frontend (React Native/Expo)
```bash
npm install
```

### 2. ติดตั้ง Backend (Express/MongoDB)
```bash
cd backend
npm install
```

### 3. ตั้งค่า Environment
- สร้างไฟล์ `backend/.env` (ดูตัวอย่างใน `.env.example`)
- ใส่ MongoDB Atlas Connection String และ JWT Secret

### 4. รัน Backend
```bash
cd backend
npm run dev
```

### 5. รัน Frontend (Expo)
```bash
expo start
```

## API หลัก (Backend)
- POST   `/api/auth/register`   : สมัครสมาชิก
- POST   `/api/auth/login`      : เข้าสู่ระบบ (รับ JWT)
- GET    `/api/accounts`        : ดูบัญชีทั้งหมด
- POST   `/api/accounts`        : สร้างบัญชีใหม่
- ... (ดู routes ใน backend/routes/)

## การเชื่อมต่อ API (Frontend)
- ใช้ fetch หรือ axios เรียก API backend
- แนบ JWT token ใน header ทุก request ที่ต้องการ auth
- จัดการ state ด้วย Context API

## ฟีเจอร์เพิ่มเติม
- อัปโหลด/แสดงรูปภาพ (expo-image-picker)
- กราฟ P&L (react-native-chart-kit)
- ธีม/ภาษา (AsyncStorage)

## หมายเหตุ
- สามารถขยายฟีเจอร์, เพิ่ม unit test, deploy backend ไปยัง cloud ได้
- หากต้องการรายละเอียดแต่ละไฟล์/หน้าจอ ดูในโฟลเดอร์ screens/ และ backend/

---

**พัฒนาโดย:** [ชื่อทีม/ผู้พัฒนา]


## หน้าจอที่ควรมีในโปรเจกต์ (Frontend)

- `screens/MainScreen.js` : หน้า Dashboard/Overview (หน้าหลัก)
- `screens/AccountsScreen.js` : หน้าบัญชีเทรด
- `screens/SetupsScreen.js` : หน้ารายการกฎการเทรดทั้งหมด
- `screens/NewSetupScreen.js` : ฟอร์มสร้าง/แก้ไขกฎการเทรดใหม่
- `screens/SetupDetailScreen.js` : หน้ารายละเอียดกฎการเทรด
- `screens/HistoryScreen.js` : หน้ารายการประวัติการเทรดทั้งหมด
- `screens/TradeDetailScreen.js` : หน้ารายละเอียดของรายการเทรด
- `screens/NewTradeScreen.js` : ฟอร์มบันทึกการเทรดใหม่
- `screens/SelectSetupScreen.js` : เลือกกฎการเทรดสำหรับเทรดใหม่
- `screens/ChecklistScreen.js` : ตรวจสอบ Checklist ทางเทคนิค/จิตวิทยา
- `screens/Auth/LoginScreen.js` : หน้าจอเข้าสู่ระบบ
- `screens/Auth/RegisterScreen.js` : หน้าจอลงทะเบียนผู้ใช้

> หมายเหตุ: หากยังไม่มีไฟล์เหล่านี้ สามารถสร้างไฟล์เปล่าไว้ก่อนได้ แล้วค่อยพัฒนา UI/Logic ภายหลัง