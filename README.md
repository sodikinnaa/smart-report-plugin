# Smart Report MCP Plugin for OpenClaw (v1.0.8)

Plugin integrasi resmi untuk menghubungkan OpenClaw dengan ekosistem **Smart Report**. Memungkinkan analisis data karyawan, laporan harian, dan dashboard KPI secara real-time.

## 🚀 Quick Start
```bash
# 1. Instal Plugin
openclaw plugins install @sodikinnaa/smart-report-plugin

# 2. Aktivasi Token
openclaw smart-auth YOUR_SECRET_TOKEN

# 3. Cek status semua fungsi MCP
openclaw smart-status
```

## ✅ Command Tambahan
- `openclaw smart-auth <token>` → menyimpan dan validasi token Smart Report.
- `openclaw smart-status` → health-check semua fungsi MCP utama:
  - `company/info`
  - `smartreport/dashboard`
  - `employees/list`
  - `reports/list`
  - `divisions/list`
  - `guides/list`
  - `analyze_performance`


## 📖 Dokumentasi Lengkap
Kami telah menyediakan panduan langkah-demi-langkah untuk pengguna teknis maupun non-teknis:
*   [**Panduan Pengguna (User Guide)**](docs/USER_GUIDE.md) - Prasyarat, Instalasi, Tooling, dan Troubleshooting.

## 🛠️ Fitur Utama
*   **MCP Integration:** Mendukung standar Model Context Protocol.
*   **KPI Dashboard:** Data agregasi harian (Compact/Full/Ops mode).
*   **Deep Analysis:** Tool untuk mendeteksi "Debt Performance" karyawan.
*   **Division Aware:** Data karyawan sekarang sudah menyertakan nama divisi.

## ⚖️ Lisensi
Distributed under the MIT License. See `LICENSE` for more information.

---
*Powered by Sultan Engine*
