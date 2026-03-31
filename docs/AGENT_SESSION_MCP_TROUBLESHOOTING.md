# Troubleshooting: Native Command Jalan, Tapi Agent Session Tidak Bisa Akses Smart Report

Panduan ini menjelaskan kasus ketika plugin Smart Report terlihat **aktif** — misalnya command seperti `/smart_reports` atau `/smart_dashboard` berjalan normal — tetapi agent di sesi chat biasa masih menjawab seolah-olah tidak bisa mengakses data Smart Report.

Contoh gejala:

- User menulis: **"bisa bantu cek laporan smart report"**
- Agent menjawab: **"konektor smart report di sesi ini masih bermasalah"**
- Padahal command `/smart_reports` tetap bisa dipakai dan mengembalikan data.

## Ringkasan masalah

Ini biasanya **bukan** berarti plugin mati total.

Yang sering terjadi adalah ada perbedaan antara tiga layer berikut:

1. **Native / chat command plugin**
   - Contoh: `/smart_reports`, `/smart_dashboard`
   - Jika ini jalan, artinya registrasi command plugin berhasil.

2. **Plugin tools untuk agent reasoning**
   - Contoh: `get_list_reports`, `get_reports_summary`, `get_daily_dashboard`
   - Ini yang dibutuhkan agar agent chat biasa bisa mengambil data Smart Report secara langsung.

3. **Skill plugin**
   - Skill membantu agent memilih tool dan memformat jawaban.
   - Skill **bukan** pengganti akses tool/runtime.

Jadi, **command aktif tidak selalu berarti tool agent ikut aktif**.

## Gejala dan artinya

### Gejala A — `/smart_reports` jalan, tapi agent bilang tidak bisa akses Smart Report
Arti paling mungkin:
- plugin command aktif
- backend Smart Report bisa dihubungi
- **tetapi tool plugin belum terlihat / belum dipakai oleh agent session**

### Gejala B — `_raw` command jalan, tapi chat biasa tetap memberi jawaban generik
Arti paling mungkin:
- agent sedang menjawab dari asumsi/model behavior
- bukan dari pemanggilan tool Smart Report nyata

### Gejala C — agent tidak menyebut error nyata seperti token missing / 401 / timeout
Arti paling mungkin:
- tool kemungkinan **tidak pernah terpanggil**
- agent hanya memberi fallback natural-language biasa

## Penyebab paling umum

### 1. Plugin command aktif, tetapi plugin tools belum terekspos ke agent session
Ini penyebab paling sering.

### 2. Skill ada, tetapi runtime agent tidak memuat tool plugin
Skill hanya membantu perilaku agent. Skill tidak otomatis "menyambungkan" tool.

### 3. Session/channel tertentu belum memakai plugin tool layer yang sama
Beberapa runtime bisa menampilkan command plugin, tetapi session agent chat biasa belum punya akses tool yang sama.

### 4. Agent tidak cukup diarahkan untuk memakai tool
Walaupun tool tersedia, model bisa tetap menjawab dari asumsi jika instruksi pemakaian tool kurang kuat.

## Checklist diagnosis

Lakukan langkah berikut secara berurutan.

### Langkah 1 — pastikan plugin command benar-benar aktif
Uji command berikut:

```text
/smart_reports
/smart_reports_raw
/smart_dashboard
/smart_dashboard_raw
```

Jika command-command ini berjalan, berarti:
- plugin aktif
- registrasi command berhasil
- koneksi backend dasar kemungkinan normal

### Langkah 2 — pastikan autentikasi/token valid
Jalankan dari CLI:

```bash
openclaw smart-auth <TOKEN_SMART_REPORT>
openclaw smart-status
```

Jika `smart-status` sukses, berarti backend dan token dasar normal.

### Langkah 3 — pastikan plugin tools memang terdaftar di plugin
Plugin ini saat ini mendaftarkan tool berikut:

- `get_daily_dashboard`
- `get_guides_list`
- `get_guide_content`
- `get_list_reports`
- `get_reports_summary`
- `get_report_detail`
- `get_debt_analysis`

Jika tool sudah ada di source, tetapi agent chat biasa tetap tidak memakainya, berarti masalah kemungkinan ada di **runtime exposure**, bukan di source plugin semata.

### Langkah 4 — uji perilaku agent session
Coba prompt natural seperti:

```text
bisa bantu cek laporan smart report terbaru?
```

Lalu amati hasilnya.

#### Jika agent langsung memberi jawaban generik seperti:
- "konektor masih bermasalah"
- "aku belum bisa akses smart report di sesi ini"
- "kirim screenshot saja"

maka besar kemungkinan:
- tool plugin tidak dipakai
- atau tool plugin tidak tersedia di session tersebut

#### Jika agent memberi error spesifik seperti:
- token missing
- unauthorized
- request timeout
- endpoint error

maka berarti tool kemungkinan benar-benar terpanggil.

## Cara membedakan command vs tool access

| Kondisi | Artinya |
|---|---|
| `/smart_reports` berhasil | Registrasi command plugin aktif |
| `/smart_reports_raw` berhasil | Backend report bisa diambil dari plugin command |
| Chat biasa gagal akses data | Tool plugin belum terlihat / belum dipakai oleh agent |
| Skill aktif tapi tool tetap tidak kepakai | Skill tidak cukup; runtime tool exposure belum beres |

## Workaround yang direkomendasikan

Jika agent session belum bisa memakai tool Smart Report secara langsung, gunakan pendekatan berikut.

### Opsi 1 — pakai command khusus untuk user
Sarankan user memakai command berikut:

```text
/smart_reports
/smart_dashboard
/smart_analysis
```

Untuk debugging struktur data:

```text
/smart_reports_raw
/smart_dashboard_raw
/smart_analysis_raw
```

### Opsi 2 — gunakan command sebagai jalur data, agent sebagai jalur analisis
Alur praktis:
1. User jalankan command `_raw` atau command biasa.
2. Data muncul di chat.
3. Agent membantu menjelaskan, merangkum, atau menganalisis hasil tersebut.

Ini belum ideal, tetapi paling stabil jika tool session belum tersambung.

### Opsi 3 — tambahkan command yang lebih natural
Bila user tidak suka memakai banyak command teknis, buat command yang lebih semantik seperti:

- `/smart_reports_summary`
- `/smart_report_detail {"id":434}`
- `/smart_help`

Tujuannya agar user tetap bisa memakai fitur Smart Report tanpa bergantung pada auto tool invocation oleh agent.

## Apa yang perlu diperbaiki agar benar-benar terasa seperti MCP untuk agent session?

### 1. Pastikan runtime session benar-benar melihat plugin tools
Ini inti masalahnya. Jika runtime session tidak expose tools plugin, agent tidak akan bisa memakai Smart Report walaupun plugin command aktif.

### 2. Perkuat deskripsi tool
Tool description harus jelas kapan tool digunakan.

Contoh yang baik:
- gunakan `get_reports_summary` saat user minta ringkasan report terbaru
- gunakan `get_report_detail` saat user minta detail report berdasarkan ID

### 3. Perkuat skill
Skill harus menginstruksikan agent:
- ambil data via tool terlebih dahulu
- jangan menjawab dari asumsi jika data tersedia lewat tool
- jangan tampilkan JSON mentah kecuali mode raw/debug

### 4. Sediakan tool yang lebih dekat ke kebutuhan user
Tool yang terlalu mentah membuat model lebih sulit memilih dan memakainya dengan tepat.

Tool yang lebih agent-friendly biasanya lebih mudah dipakai, misalnya:
- `get_reports_summary`
- `get_report_detail`
- `get_daily_dashboard`

## Rekomendasi arsitektur

### Untuk penggunaan cepat sekarang
Gunakan dua jalur:

- **jalur command** → untuk mengambil data Smart Report dengan pasti
- **jalur agent** → untuk merangkum, menjelaskan, dan membantu keputusan

### Untuk target jangka lebih matang
Pastikan agent session benar-benar dapat memanggil plugin tools secara langsung, lalu gunakan skill untuk memandu perilaku model.

## Template fallback reply yang lebih benar

Jika agent session memang belum bisa memakai tool Smart Report, lebih baik jawab jujur dan terarah, misalnya:

> Aku belum berhasil memakai tool Smart Report langsung dari sesi chat ini. Tapi plugin command-nya aktif. Supaya cepat, jalankan salah satu ini dulu:
>
> - `/smart_reports`
> - `/smart_dashboard`
> - `/smart_analysis`
>
> Kalau mau debug struktur datanya:
>
> - `/smart_reports_raw`
> - `/smart_dashboard_raw`
>
> Setelah data muncul, aku bisa bantu baca, ringkas, dan analisis.

Jawaban seperti ini lebih akurat dibanding jawaban generik seperti “konektor bermasalah” tanpa pembuktian.

## Kesimpulan

Jika `/smart_reports` berjalan tetapi agent chat biasa tidak bisa mengambil data Smart Report, maka masalahnya biasanya ada pada:

- **tool exposure ke agent session**, atau
- **agent tidak benar-benar memanggil tool plugin**, bukan semata pada skill.

Skill penting, tetapi skill tidak menggantikan akses tool runtime.

## Referensi internal plugin

File yang relevan di repo ini:
- `src/commands.ts`
- `src/tools.ts`
- `skills/smart-report/SKILL.md`
- `README.md`

Jika ingin melanjutkan diagnosis, cek juga status plugin, tool exposure, dan perilaku runtime OpenClaw pada session/channel yang dipakai bot.
