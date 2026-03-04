# Smart Report MCP Plugin for OpenClaw (v1.0.8)

Plugin integrasi resmi untuk menghubungkan OpenClaw dengan ekosistem **Smart Report**. Memungkinkan analisis data karyawan, laporan harian, dan dashboard KPI secara real-time.

## 🚀 Quick Start
```bash
# 1. Instal Plugin
openclaw plugins install @sodikinnaa/smart-report-plugin

# 2. Aktivasi Token
openclaw smart-auth YOUR_SECRET_TOKEN
```

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

## 🗑️ Cara Uninstall Plugin

Jika Anda ingin menghapus plugin ini dari OpenClaw Anda, jalankan perintah berikut di terminal:

```bash
# Hapus instalasi plugin
openclaw plugins uninstall @sodikinnaa/smart-report-plugin

# (Opsional) Hapus konfigurasi token jika Anda ingin membersihkannya
openclaw smart-auth --remove
```

> **Catatan:** Jika Anda juga ingin menghapus aplikasi OpenClaw dari sistem Anda, silakan baca panduan lengkapnya di sini: [Panduan Uninstall OpenClaw](docs/UNINSTALL_OPENCLAW.md).
