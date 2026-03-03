# Smart Report Plugin for OpenClaw

Plugin ini mengintegrasikan ekosistem OpenClaw dengan sistem pelaporan Smart Report via protokol MCP.

## 🛠️ Fitur
- **CLI Auth:** Autentikasi mudah menggunakan token API.
- **Resources:** Akses data real-time via URI `smartreport://`.
- **Agent Tools:** Memungkinkan AI melakukan analisis laporan dan performa secara otonom.

## 🚀 Instalasi
1. Clone repositori ini ke folder `~/.openclaw/extensions/`.
2. Jalankan `npm install` dan `npm run build`.
3. Tambahkan entry di `openclaw.json`:
   ```json
   "plugins": {
     "allow": ["smart-report-plugin"]
   }
   ```

## 🔑 Konfigurasi
Lakukan autentikasi via CLI:
```bash
openclaw smart-auth <YOUR_API_TOKEN>
```

## 📖 URI Resources
- `smartreport://reports`: 10 Laporan terbaru.
- `smartreport://employees`: Daftar seluruh karyawan.
- `smartreport://debt-aging`: Analisis keterlambatan/absen.

## 🤖 AI Tools
- `get_list_reports`: Mengambil laporan dengan filter.
- `get_debt_analysis`: Analisis performa dan tugas tertunda.
