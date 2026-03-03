# 📊 Panduan Lengkap Smart Report MCP Plugin

Selamat datang di ekosistem Smart Report! Plugin ini memungkinkan asisten AI Anda (OpenClaw) terhubung langsung dengan data operasional perusahaan secara real-time.

---

## 1. Prasyarat (Prerequisites)

Sebelum instalasi, pastikan Anda memiliki:
*   **Environment:** Node.js v20+ dan OpenClaw Gateway terpasang.
*   **Token API:** Token akses sah dari Admin Smart Report (Misal: `Wkr4v8Tj...`).
*   **Akses Internet:** Dibutuhkan untuk instalasi package dan request data ke server.

---

## 2. Instalasi (Installation)

### Jalur Normal (NPM)
Gunakan perintah ini di terminal OpenClaw:
```bash
openclaw plugins install @sodikinnaa/smart-report-plugin
```

### Jalur Fallback (Jika NPM/Cache Bermasalah)
Jika instalasi gagal karena kendala versi lama atau cache, gunakan link tarball langsung:
```bash
openclaw plugins install https://registry.npmjs.org/@sodikinnaa/smart-report-plugin/-/smart-report-plugin-1.0.8.tgz
```

---

## 3. Aktivasi & Autentikasi (Auth)

Setelah terinstal, Anda wajib mendaftarkan token Anda agar AI bisa mengakses data:

**Perintah:**
```bash
openclaw smart-auth <TOKEN_ANDA>
```

**Contoh Sukses:**
`✅ Smart Report API Token saved successfully.`

**Contoh Gagal:**
`❌ Failed to save config: ...` (Pastikan Anda menjalankan perintah di terminal yang memiliki izin tulis ke folder `.openclaw`).

---

## 4. Daftar Resource & Tool

### 🔎 Resource (Data Statis/Stream)
AI dapat membaca resource ini untuk mendapatkan konteks:
*   `smartreport://dashboard`: Data KPI hari ini (Total karyawan, kehadiran, completion rate).
*   `smartreport://employees`: Daftar lengkap karyawan beserta nama divisinya.
*   `smartreport://reports`: Aliran 10 laporan terbaru yang masuk.
*   `smartreport://divisions`: Daftar seluruh divisi di perusahaan.

### 🛠️ Agent Tools (Aksi Dinamis)
AI dapat menjalankan perintah spesifik:
*   **`get_daily_dashboard`**: Mengambil ringkasan statistik harian.
*   **`get_list_reports`**: Mencari laporan berdasarkan filter (tanggal, divisi, nama).
*   **`get_debt_analysis`**: Menganalisis siapa saja yang belum lapor atau memiliki tugas tertunda.

---

## 5. Mode Dashboard

Saat meminta dashboard, Anda dapat menentukan `mode`:
1.  **Compact (Default):** Ringkasan angka utama saja. Cocok untuk update cepat di chat.
2.  **Full:** Menyertakan detail statistik per divisi. Cocok untuk laporan manajemen.
3.  **Ops:** Menyertakan alert sistem dan highlight operasional. Cocok untuk monitoring tim.

---

## 6. Workflow Harian (Best Practice)

Berikut adalah contoh alur kerja asisten AI Anda setiap hari:
1.  **Pagi (09:00):** AI mengecek `smartreport://employees` untuk memetakan tim.
2.  **Siang (13:00):** AI menjalankan `get_daily_dashboard(mode="compact")` untuk melihat progres awal.
3.  **Sore (17:00):** AI menjalankan `get_debt_analysis` dan memberikan daftar orang yang belum lapor kepada Admin.
4.  **Malam (20:00):** AI menarik `get_daily_dashboard(mode="full")` untuk laporan penutup ke WhatsApp Owner.

---

## 7. Troubleshooting (Solusi Cepat)

*   **Error: `ReferenceError exports is not defined`**
    *   *Solusi:* Update ke versi v1.0.6+ (`npm install ...@latest`).
*   **Error: `package.json missing openclaw.extensions`**
    *   *Solusi:* Update ke versi v1.0.4+.
*   **Error: `Method not found (-32601)`**
    *   *Solusi:* Pastikan backend sudah terupdate ke v1.3.0.
*   **Error: `Unauthorized`**
    *   *Solusi:* Masukkan kembali token valid menggunakan `openclaw smart-auth`.

---
*Dokumentasi ini dibuat oleh Sultan Engine Core untuk memastikan kelancaran operasional Anda.*
