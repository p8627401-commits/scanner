# SmartCard Attendance System 🎓💳
### Full-Stack Web Application for Student Attendance Card Scanning

A complete, production-ready full-stack attendance management system designed for **physical card tap check-in with USB hardware scanners** (RFID, NFC, Barcode, or Magnetic Stripe readers). Features a clean physical separation between the **Scanner Kiosk Station** (for students at gates/doors) and the **Administrative Management Portal**.

---

## 🌟 Key Features

### 1. 💳 USB Hardware Card Scanner Engine
- **Hardware Compatibility**: Works out-of-the-box with **any standard USB RFID / NFC Tap Card reader** (e.g. 13.56MHz Mifare, 125kHz EM-ID, Sycreader, Neuftech, ACR122U HID wedge, Barcode / QR scanners).
- **Zero Configuration**: Physical USB readers emulate a USB HID Keyboard, rapidly transmitting the card UID followed by `Enter`.
- **Global Keystroke Interceptor**: Automatically captures hardware card swipes even if the browser has lost input focus or no text box is clicked.
- **Debounce Protection**: Prevents accidental double-tapping within 25 seconds.
- **Audio-Visual Feedback**: Synthesizes real-time sound chimes using the **Web Audio API** (Success chime for on-time arrivals, Warning chime for late arrivals, Buzzer for unregistered cards, and soft chord for check-outs).
- **On-Screen Card Simulator**: Includes an interactive virtual card tap simulator so you can test all flows without physical hardware plugged in.

---

### 2. 🔀 Physical Separation: Scanner Kiosk vs. Admin Portal
- **Scanner Kiosk (`/` or `/scanner`)**:
  - Full-screen kiosk interface with school branding and live digital clock.
  - Large interactive radar card tap target.
  - Mode switcher: **Smart Auto Toggle**, **Check-In Only** (morning gate), or **Check-Out Only** (afternoon dismissal).
  - Floating card reveal pop-up showing student photo, full name, student ID, class, timestamp, status, and confetti animation on on-time check-in.
  - Live stream ticker showing today's recent students who tapped their cards.
  - **Security PIN Lock**: Exiting the kiosk requires a 4-digit PIN (default: `1234`), preventing students from tampering with administrative controls.
- **Admin Management Portal (`/admin`)**:
  - Password-protected with session tokens (Default credentials: `admin` / `admin123`).
  - Real-time Dashboard with KPI metrics, attendance turnout %, and class breakdown.

---

### 3. 📋 Attendance Audit Logs & Tracking
- **Live Attendance Logs**: Filter by date or date range, class/grade, status (On Time, Late, Checked Out, Early Departure, Manual), or search by student name/ID/Card UID.
- **Manual Check-In/Out**: Easily log attendance for students who forgot their cards or have excused notes.
- **Full Audit Log**: Edit or remove attendance records with complete timestamped audit logging.

---

### 4. 🖨️ Printing Center
- **Daily Attendance Register Sheet**:
  - Print-ready formal class register with school header, date, enrolled count, present/late/absent counts, and teacher/principal signature lines.
- **Student ID Badges / Tap Cards**:
  - Formatted badge grid with student photo, name, class, student ID, card UID, and **generated scannable QR code**.
  - Cut-guidelines formatted for standard A4/Letter paper printing.

---

### 5. 📊 Data Export Center
- **1-Click Attendance Logs to CSV**: Formatted with UTF-8 BOM for direct double-click opening in Microsoft Excel and Google Sheets.
- **1-Click Student Registry to CSV**: Complete export of all students with mapped card numbers and emergency contacts.

---

### 6. 💾 Backup & Disaster Recovery
- **1-Click JSON System Snapshot**: Downloads all students, attendance logs, classes, settings, and audit logs.
- **Direct SQLite Database Download**: Download the live binary `attendance.db` file.
- **Restore from Backup**: Upload any JSON backup snapshot with pre-restore data validation and rollback protection.
- **Reset Demo State**: 1-click restore to sample demonstration data.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18, v20, v22, or v24)
- Any USB RFID / NFC Tap Card reader (acts as standard USB keyboard input)

### Installation & Launch

1. **Start the Application**:
   ```bash
   npm start
   ```
   *(Or run `node server/index.js`)*

2. **Open in Browser**:
   - **Scanner Kiosk**: [http://localhost:5000/](http://localhost:5000/)
   - **Admin Portal**: [http://localhost:5000/admin](http://localhost:5000/admin)

---

## 🔑 Default Credentials & PINs

| Role | Username | Password / PIN | Description |
| :--- | :--- | :--- | :--- |
| **Admin Portal** | `admin` | `admin123` | Login to administrative dashboard |
| **Kiosk Exit PIN** | — | `1234` | Unlock kiosk mode to switch to admin |

*(Both can be modified at any time in **Admin -> Settings**)*

---

## 💳 Sample Physical Card UIDs for Testing

When testing without a physical reader, or to test with your USB reader, use these pre-registered student cards:

| Student Name | Class | Student ID | Card UID |
| :--- | :--- | :--- | :--- |
| **Sophia Vandeth** | Grade 10-A (Science) | `STU-2026-001` | `1098234751` |
| **Phally Kosal** | Grade 11-A (Engineering) | `STU-2026-002` | `04A8F91B2C` |
| **Marcus Chen** | Grade 10-A (Science) | `STU-2026-003` | `CARD-001` |
| **Emma Watson** | Grade 12-A (AP) | `STU-2026-004` | `CARD-002` |
| **Lucas Silva** | Grade 10-B (Arts) | `STU-2026-005` | `CARD-003` |

*To enroll new cards, go to **Admin -> Students -> Add New Student -> Tap Card to Read** and tap any new physical card on your USB reader!*

---

## 📁 Project Architecture

```
scanner/
├── server/
│   ├── index.js             # Express application & static file server
│   ├── db.js                # Built-in SQLite database engine (node:sqlite)
│   ├── routes/
│   │   ├── auth.js          # Admin login & password management
│   │   ├── scanner.js       # USB hardware tap card processing & debouncing
│   │   ├── students.js      # Student CRUD, card mapping & photo upload
│   │   ├── attendance.js    # Attendance query filters & manual entries
│   │   ├── reports.js       # Daily attendance register & summary reports
│   │   ├── exports.js       # CSV streams for Excel / Sheets
│   │   ├── backup.js        # Full JSON & binary DB backup & restore
│   │   └── settings.js      # School configuration & audit logs
│   ├── uploads/             # Student portrait images
│   └── public/              # Built production client SPA
├── client/
│   ├── src/
│   │   ├── App.jsx          # Route manager & protected guards
│   │   ├── hooks/
│   │   │   └── useHardwareScanner.js # USB HID keyboard burst reader hook
│   │   ├── utils/
│   │   │   └── audio.js     # Web Audio API zero-latency chime synthesizer
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Admin session state
│   │   └── pages/
│   │       ├── ScannerKiosk.jsx      # Dedicated Tap Card Kiosk
│   │       ├── admin/
│   │       │   ├── AdminLogin.jsx    # Portal sign-in
│   │       │   ├── AdminDashboard.jsx# Real-time analytics
│   │       │   ├── AttendanceLogs.jsx# Audit log tracker
│   │       │   ├── StudentsManager.jsx# Student & card mapper
│   │       │   ├── ReportsPrinting.jsx# Printable registers & badges
│   │       │   ├── ExportCenter.jsx  # CSV data downloads
│   │       │   ├── BackupRestore.jsx # JSON & DB restore hub
│   │       │   └── SettingsPage.jsx  # School policies & PINs
│   └── package.json
├── data/
│   └── attendance.db        # SQLite database file
└── package.json
```
