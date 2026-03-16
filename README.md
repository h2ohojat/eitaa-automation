# Eitaa Auto Forward

Automated message forwarding system for Eitaa using Node.js + Playwright + Express + Socket.IO.

---

## 🚀 What's included

- `index.js`, `auto-forward.js`, `forward-test.js`: core auto-forwarding bot and workflow
- `login.js`: login/session management
- `read-channel.js`: read channel messages
- `logger.js`: logging utility
- `config.json`: runtime settings (targets, delays, messages, etc.)
- `admins.txt`: allowed admin list
- `eitaa-session/`: browser session persistence for login
- `web/server.js`: dashboard backend
- `web/public`, `web/src`: real-time UI + control panel

---

## ⚙️ Installation

1. `git clone https://github.com/YOUR_USERNAME/eitaa-automation.git`
2. `cd eitaa-auto-forward`
3. `npm install`
4. `npx playwright install`

---

## ▶️ Run

- `node index.js` (or `node auto-forward.js`/`node forward-test.js`)
- dashboard:
  - `cd web`
  - `node server.js`

---

## 🛠️ Config

`config.json` example:

```json
{
  "source": "channel-id",
  "target": "chat-id",
  "message": "Hello",
  "delaySeconds": 10
}
```

`admins.txt`:

- one username per line, controls who can use web dashboard actions

---

## ✅ Features

- auto-forward messages
- start/stop control via web dashboard
- real-time logs (socket.io)
- admin access restrictions
- session persistence (no re-login every run)

---

## 📚 مستندات فارسی

### 🔹 اجزای اصلی

- `index.js`, `auto-forward.js`, `forward-test.js`: منطق اصلی ربات
- `login.js`: مدیریت ورود
- `read-channel.js`: خواندن پیام
- `logger.js`: ثبت لاگ
- `config.json`: تنظیمات هدف، پیام، زمان‌بندی و...
- `admins.txt`: محدودیت دسترسی ادمین
- `eitaa-session/`: داده‌های نشست
- `web/`: داشبورد وب (Express + Socket.IO)

### 🔹 نصب

1. `npm install`
2. `npx playwright install`
3. `node index.js`

### 🔹 اجرا با داشبورد

- `cd web`
- `node server.js`

### 🔹 هدف پروژه

اتوماتیک کردن ارسال/فوروارد پیام در ایتا با داشبورد مانیتورینگ، لاگ لایو، مدیریت سشن و محدودیت ادمین.

---

## 📌 نکته

در صورت تمایل می‌توان قالب `README.md` را با دستورالعمل‌های پیکربندی دقیق‌تر و FAQ گسترده‌تر گسترش داد.
