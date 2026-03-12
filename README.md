# NexaISP — ISP Management System
> Sistem manajemen ISP lengkap untuk Ubuntu 20.04/22.04 LTS

---

## ⚡ Instalasi Cepat

```bash
# 1. Clone atau upload project ke server
git clone https://github.com/Ikomangarta/billing /tmp/nexaisp-src

# 2. Jalankan installer (sebagai root)
sudo bash installer/install.sh
```

---

## 📦 Fitur Lengkap

| Modul | Fitur |
|-------|-------|
| **Pelanggan** | CRUD, status aktif/isolir/suspend, PPPoE otomatis |
| **Mikrotik** | RouterOS API, PPPoE secrets, active sessions, profiles, IP pool |
| **Paket** | Manajemen paket internet, sync profile Mikrotik otomatis |
| **Invoice** | Generate otomatis, multi-periode, pajak PPN |
| **Pembayaran** | Midtrans Snap + Xendit Invoice, auto-restore setelah bayar |
| **WhatsApp** | Fonnte API, blast pelanggan, template dinamis, log |
| **ACS/GenieACS** | TR-069, reboot ONU, set WiFi, konfigurasi PPPoE CPE |
| **Peta Jaringan** | Google Maps, pin pelanggan, area jaringan, ODP/tiang |
| **Isolir** | Isolir manual/otomatis, notif WA, restore setelah bayar |
| **Cek Tagihan** | Halaman publik, cek by no.pelanggan/telepon/username |

---

## 🔧 Tech Stack

- **Backend**: Node.js 20 + Express.js
- **Database**: PostgreSQL 14+
- **Cache**: Redis
- **Frontend**: React 18 + Vite + Recharts
- **Web Server**: Nginx + PM2
- **OS**: Ubuntu 20.04 / 22.04 LTS

---

## 📁 Struktur Direktori

```
/opt/nexaisp/
├── backend/
│   ├── src/
│   │   ├── server.js          # Entry point
│   │   ├── config/            # DB, Redis config
│   │   ├── routes/            # API routes
│   │   ├── controllers/       # Business logic
│   │   ├── services/          # Mikrotik, Payment, WA, ACS
│   │   ├── middleware/        # Auth, validation
│   │   └── utils/             # Migrate, cron, helpers
│   ├── .env                   # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app
│   │   ├── pages/             # Per-page components
│   │   ├── components/        # Reusable UI
│   │   └── store/             # Zustand state
│   └── dist/                  # Built frontend
└── ecosystem.config.js        # PM2 config
```

---

## ⚙️ Konfigurasi Post-Install

### 1. Mikrotik
Buka **Settings > Mikrotik** dan tambahkan device:
- Host: IP Mikrotik
- Port: 8728 (atau 8729 untuk SSL)
- Username/Password API Mikrotik

Pastikan API service aktif di Mikrotik:
```
/ip service enable api
```

### 2. Midtrans
1. Login ke dashboard.midtrans.com
2. Settings > Access Keys
3. Salin Server Key & Client Key ke Settings > Payment

### 3. Xendit
1. Login ke dashboard.xendit.co
2. Settings > API Keys
3. Salin Secret Key ke Settings > Payment

### 4. Fonnte WhatsApp
1. Daftar di fonnte.com
2. Scan QR WhatsApp
3. Salin token ke Settings > WhatsApp

### 5. GenieACS (ACS)
Install GenieACS di server yang sama:
```bash
npm install -g genieacs
genieacs-cwmp --port 7547 &
genieacs-nbi --port 7557 &
genieacs-ui --port 3000 &
```
Konfigurasi di Settings > GenieACS

### 6. Google Maps
1. Buka console.cloud.google.com
2. Enable Maps JavaScript API
3. Buat API Key
4. Masukkan di Settings > Peta

---

## 🔄 Auto-Billing (Cron Jobs)

Edit crontab:
```bash
crontab -e
```

Tambahkan:
```
# Generate invoice setiap hari jam 00:01
1 0 * * * node /opt/nexaisp/backend/src/utils/cron.js generate-invoices

# Auto-isolir pelanggan yang jatuh tempo
0 8 * * * node /opt/nexaisp/backend/src/utils/cron.js auto-isolate

# Send reminder WA H-3 jatuh tempo
0 9 * * * node /opt/nexaisp/backend/src/utils/cron.js send-reminders
```

---

## 🌐 URL Akses

| URL | Keterangan |
|-----|------------|
| `http://domain/` | Dashboard Admin |
| `http://domain/cek` | Cek Tagihan Publik |
| `http://domain/admin` | Login Admin |
| `http://domain/api/` | REST API |
| `http://domain/health` | Health Check |

---

## 🔒 Keamanan

- JWT Authentication untuk semua API admin
- Rate limiting: 500 req/15 menit
- Helmet.js security headers
- UFW firewall (only 80, 443, SSH)
- Password hashing dengan bcrypt
- Environment secrets di `.env`

---

## 📞 API Endpoints

```
POST   /api/auth/login
GET    /api/customers
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
POST   /api/customers/:id/isolate
POST   /api/customers/:id/restore
POST   /api/customers/:id/send-wa

GET    /api/mikrotik/devices
POST   /api/mikrotik/pppoe
GET    /api/mikrotik/sessions/:deviceId
POST   /api/mikrotik/profiles

GET    /api/invoices
POST   /api/invoices
POST   /api/invoices/generate-monthly
POST   /api/invoices/auto-isolate

POST   /api/payment/create/:invoiceId
POST   /api/payment/midtrans/callback
POST   /api/payment/xendit/callback

POST   /api/whatsapp/send
POST   /api/whatsapp/blast

GET    /api/acs/devices
POST   /api/acs/reboot/:deviceId
POST   /api/acs/set-wifi/:deviceId

GET    /api/public/cek-tagihan?q=CUST-0001
GET    /api/public/payment-link/:invoiceNo
```

---

## 🛠️ Management Commands

```bash
# Status aplikasi
pm2 status

# Restart backend
pm2 restart nexaisp-backend

# Lihat log
pm2 logs nexaisp-backend

# Update aplikasi
cd /opt/nexaisp && git pull
npm run build && pm2 restart nexaisp-backend

# Backup database
pg_dump nexaisp_db > backup_$(date +%Y%m%d).sql

# Restore database
psql nexaisp_db < backup_20240101.sql
```

---

## 📄 Lisensi
MIT License — NexaISP © 2024
