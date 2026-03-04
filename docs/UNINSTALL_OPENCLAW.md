# Panduan Uninstall OpenClaw

Dokumen ini berisi panduan lengkap untuk menghapus (uninstall) OpenClaw dari sistem Anda secara bersih.

## 🍎 Untuk Pengguna macOS

Karena OpenClaw pada macOS biasanya didistribusikan dalam bentuk file `.app` (seperti `OpenClaw.app`), berikut adalah langkah-langkah untuk menghapusnya secara total:

### 1. Hapus Aplikasi Utama
1. Pastikan aplikasi OpenClaw sudah ditutup (Quit).
2. Buka **Finder** dan masuk ke folder **Applications** (`/Applications`).
3. Cari aplikasi **OpenClaw.app**.
4. Klik kanan dan pilih **Move to Trash** (Pindahkan ke Tong Sampah).

### 2. Hapus File Konfigurasi dan Data Tersembunyi (Clean Uninstall)
OpenClaw menyimpan data konfigurasi, logs, dan ekstensi di folder tersembunyi. Buka aplikasi **Terminal** dan jalankan perintah berikut secara berurutan:

```bash
# Menghapus folder konfigurasi utama OpenClaw di home directory
rm -rf ~/.openclaw

# Menghapus Application Support files
rm -rf ~/Library/Application\ Support/OpenClaw

# Menghapus Caches
rm -rf ~/Library/Caches/com.openclaw.app
rm -rf ~/Library/Caches/OpenClaw

# Menghapus Preferences
rm -f ~/Library/Preferences/com.openclaw.app.plist
```

### 3. Kosongkan Trash
Setelah semua langkah di atas selesai, klik kanan ikon **Trash** (Tong Sampah) di Dock Anda dan pilih **Empty Trash**.

---

## 🐧 Untuk Pengguna Linux

Jika Anda menginstal OpenClaw menggunakan AppImage, binary, atau npm, ikuti langkah berikut:

### 1. Menghapus Binary/AppImage
Jika Anda menggunakan AppImage:
```bash
rm -f /path/to/your/OpenClaw-*.AppImage
```

Jika menginstal via npm (global):
```bash
npm uninstall -g openclaw
```

### 2. Menghapus File Konfigurasi
Sama seperti macOS, OpenClaw di Linux menyimpan data di folder `.openclaw` pada home directory:
```bash
# Hapus folder konfigurasi dan plugin
rm -rf ~/.openclaw

# Hapus cache aplikasi (jika ada)
rm -rf ~/.config/OpenClaw
```

---

*Panduan ini dibuat untuk memastikan bahwa tidak ada file sisa yang bentrok jika Anda berencana melakukan instalasi ulang (reinstall) atau downgrade versi OpenClaw.*
