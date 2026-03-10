# Smart Report MCP Plugin for OpenClaw (v1.0.8)

Plugin integrasi resmi untuk menghubungkan OpenClaw dengan ekosistem **Smart Report**. Memungkinkan analisis data karyawan, laporan harian, dan dashboard KPI secara real-time.

## 🚀 Quick Start
```bash
# 1. Instal Plugin (NPM)
openclaw plugins install @sodikinnaa/smart-report-plugin

# 2. Aktivasi Token
openclaw smart-auth YOUR_SECRET_TOKEN

# 3. Cek status semua fungsi MCP
openclaw smart-status
```

## 🛠️ Instalasi Manual via `install.sh` (Recommended untuk server custom)
Script `install.sh` akan:
- clone source plugin dari GitHub,
- install dependency + build,
- verifikasi export `register/activate`,
- copy plugin ke `~/.openclaw/extensions/smart-report-plugin`,
- update `plugins.allow` (jika `~/.openclaw/config.json` tersedia),
- restart OpenClaw Gateway.

### 1) Jalankan langsung dari GitHub
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh)
```

### 2) Opsi parameter
```bash
# Install branch tertentu
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh) --branch master

# Custom repository
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh) --repo https://github.com/sodikinnaa/smart-report-plugin.git

# Jika repo private (token)
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh) --token <GITHUB_TOKEN>

# Skip build / restart
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh) --skip-build
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh) --no-restart
```

### 3) Verifikasi setelah instalasi
```bash
openclaw smart-auth <TOKEN_SMART_REPORT>
openclaw smart-status
```

### 4) Troubleshooting cepat
```bash
# Cek plugin terpasang
ls -la ~/.openclaw/extensions/smart-report-plugin

# Cek export register/activate
node -e "const m=require(process.env.HOME+'/.openclaw/extensions/smart-report-plugin/dist/openclaw.cjs'); console.log(typeof m, typeof m.register, typeof m.activate)"

# Restart gateway manual
openclaw gateway restart
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
