# Panduan Pengguna Smart Report Plugin

Plugin ini menghubungkan OpenClaw dengan Smart Report untuk kebutuhan dashboard KPI, daftar laporan, guides, dan analisis performa.

## Prasyarat

- Node.js 20+
- OpenClaw terpasang dan CLI `openclaw` tersedia
- Konfigurasi OpenClaw utama sehat, terutama `gateway.mode`
- Token API Smart Report yang valid
- Akses internet ke endpoint Smart Report

---

## SOP Instalasi dan Update yang Aman

Ikuti SOP ini agar plugin tidak berubah menjadi **untracked local code**, tidak memicu warning provenance, dan tidak merusak state konfigurasi OpenClaw.

### Prinsip utama

1. **Selalu update plugin dari repository resmi**
2. **Jangan copy manual plugin ke `~/.openclaw/extensions/...`**
3. **Jangan overwrite folder plugin secara manual**
4. **Jangan edit config OpenClaw secara agresif dari installer plugin**
5. **Pastikan `openclaw plugins install` menjadi jalur utama install/update**

### Jalur install/update utama

Gunakan command ini:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh)
```

Atau dari repository lokal:

```bash
bash install.sh
```

---

## SOP Instalasi Pertama Kali

### 1. Pastikan OpenClaw sehat lebih dulu

Cek bahwa config utama tidak rusak dan gateway bisa start.

Minimal pastikan `gateway.mode` ada, misalnya:

```json
{
  "gateway": {
    "mode": "local"
  }
}
```

Jika `openclaw gateway` menampilkan error seperti:

```bash
Gateway start blocked: set gateway.mode=local (current: unset)
```

maka **perbaiki dulu config OpenClaw utama** sebelum install plugin.

### 2. Pastikan tidak ada folder plugin lama yang kotor

Sebelum install pertama kali, cek apakah plugin lama sudah pernah dicopy manual:

```bash
ls -la ~/.openclaw/extensions/smart-report-plugin
```

Jika folder itu sudah ada dari install lama/manual, **backup lalu hapus dulu** sebelum install ulang.

### 3. Jalankan installer resmi

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh)
```

Installer akan mencoba backup install lama **hanya** jika kegagalan terdeteksi karena bentrok direktori plugin yang sudah ada.

### 4. Auth token setelah install sukses

```bash
openclaw smart-auth <TOKEN_ANDA>
```

### 5. Verifikasi plugin

```bash
openclaw smart-status
```

---

## SOP Update Plugin

### Alur normal update

1. perubahan plugin di-commit dan di-push ke repository
2. mesin target menjalankan installer resmi lagi
3. installer clone source terbaru
4. installer build source terbaru
5. installer menjalankan `openclaw plugins install` dari repository source
6. lakukan verifikasi

### Command update normal

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh)
```

### Setelah update

Jalankan verifikasi:

```bash
openclaw smart-status
```

Jika plugin butuh re-auth karena environment berubah, jalankan ulang:

```bash
openclaw smart-auth <TOKEN_ANDA>
```

---

## SOP Larangan / Anti-Pattern

Jangan lakukan ini kecuali sedang recovery yang disengaja:

- copy manual plugin ke:
  - `~/.openclaw/extensions/smart-report-plugin`
- overwrite file plugin langsung dengan `cp -R`
- membiarkan folder plugin lama tetap ada lalu install ulang di atasnya
- memaksa installer menulis config trust/provenance OpenClaw tanpa audit
- menjadikan fallback manual sebagai jalur update normal

Alasan larangan ini:
- memicu warning `loaded without install/load-path provenance`
- membuat plugin dianggap **untracked local code**
- bisa menimbulkan state config yang rancu
- menyulitkan troubleshooting update berikutnya

---

## SOP Recovery Jika Update Gagal

Jika installer gagal, **jangan langsung copy manual plugin**.

Installer resmi kini hanya akan melakukan recovery terbatas untuk kasus spesifik:
- folder plugin lama sudah ada di lokasi target
- installer membackup folder lama itu
- lalu retry install resmi satu kali

Lakukan urutan ini:

### 1. Lihat penyebab gagalnya install resmi

```bash
openclaw plugins list --verbose
openclaw plugins doctor
```

### 2. Cek blocker paling umum

#### a. Plugin lama masih ada
Contoh error:
```bash
plugin already exists: ~/.openclaw/extensions/smart-report-plugin
```

Tindakan:
- backup folder lama
- hapus folder lama
- ulangi installer resmi

#### b. Config OpenClaw utama rusak
Contoh error:
```bash
Gateway start blocked: set gateway.mode=local (current: unset)
```

Tindakan:
- pulihkan `gateway.mode`
- pastikan `openclaw gateway` bisa jalan normal
- baru ulangi installer plugin

#### c. Warning trust/provenance
Contoh warning:
```bash
loaded without install/load-path provenance
plugins.allow is empty
```

Tindakan:
- rapikan install lama yang manual/untracked
- pin trust sesuai kebijakan OpenClaw host
- ulangi install dari jalur resmi

---

## Konfigurasi Plugin

Plugin menyimpan konfigurasi berikut setelah autentikasi berhasil:
- `apiToken`
- `companyDomain`
- `companyName` *(optional)*

Konfigurasi ini **tidak perlu dipaksa ada saat install awal**.

---

## Autentikasi Token

```bash
openclaw smart-auth <TOKEN_ANDA>
```

Command ini akan:
- memverifikasi token ke backend Smart Report
- mengambil info company
- menyimpan konfigurasi plugin melalui runtime OpenClaw

---

## Health Check

```bash
openclaw smart-status
```

Command ini memeriksa:
- `company/info`
- `smartreport/dashboard`
- `employees/list`
- `reports/list`
- `divisions/list`
- `guides/list`
- `analyze_performance`

---

## Resource Tersedia

- `smartreport://dashboard`
- `smartreport://employees`
- `smartreport://reports`
- `smartreport://divisions`
- `smartreport://guides`

## Tools Tersedia

- `get_daily_dashboard`
- `get_guides_list`
- `get_guide_content`
- `get_list_reports`
- `get_debt_analysis`

## Smart Commands / Chat Commands

Jika runtime OpenClaw mendukung native command di chat, plugin ini menyediakan command berikut:

- `/smart-status`
- `/smart-dashboard`
- `/smart-employees`
- `/smart-reports`
- `/smart-divisions`
- `/smart-guides`
- `/smart-guide`
- `/smart-analysis`

Catatan:
- `smart-auth` tetap command CLI, bukan command chat
- command chat memakai logic yang sama dengan fungsi Smart Report utama, tetapi outputnya diarahkan untuk interaksi chat

---

## Catatan Penting Output

Tool mengembalikan data JSON untuk reasoning internal agent. Untuk interaksi dengan user, gunakan formatting yang diarahkan oleh skill plugin `smart-report` agar tidak menampilkan JSON mentah.

---

## Troubleshooting Singkat

### Token tidak ditemukan
Pastikan sudah menjalankan:
```bash
openclaw smart-auth <TOKEN_ANDA>
```

### Plugin runtime tidak mendukung penyimpanan config
Konfigurasikan plugin melalui mekanisme config OpenClaw yang berlaku pada environment target.

### Backend mengembalikan error method/auth
Periksa token, domain backend, dan kompatibilitas endpoint Smart Report.
