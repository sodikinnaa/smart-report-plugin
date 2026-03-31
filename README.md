# Smart Report Plugin for OpenClaw

Plugin OpenClaw untuk integrasi ke ekosistem **Smart Report** melalui:
- **CLI commands** untuk autentikasi dan health check
- **chat/native commands** untuk akses cepat dari runtime OpenClaw
- **resources** untuk expose data Smart Report ke agent/runtime
- **tools** untuk reasoning agent berbasis data Smart Report
- **plugin skill** agar output ke user tetap rapi dan tidak menampilkan JSON mentah

README ini sudah disesuaikan dengan **alur code terbaru** di source saat ini, **termasuk perilaku `install.sh` terbaru**.

## Ringkasan alur terbaru

Plugin melakukan registrasi pada saat `register(api)` / `activate(api)` dipanggil, lalu:

1. mendaftarkan **CLI commands**
2. mendaftarkan **chat commands** bila runtime mendukung `registerCommand`
3. mendaftarkan **resources**
4. mendaftarkan **tools**

Struktur registrasi utama ada di `src/index.ts`:
- `registerCommands(api)`
- `registerResources(api)`
- `registerTools(api)`

## Struktur plugin

```text
smart-report-plugin/
├── package.json
├── openclaw.plugin.json
├── openclaw.cjs
├── index.js
├── install.sh
├── src/
│   ├── client.ts
│   ├── commands.ts
│   ├── resources.ts
│   ├── tools.ts
│   └── index.ts
├── dist/
│   ├── client.js
│   ├── commands.js
│   ├── resources.js
│   ├── tools.js
│   ├── index.js
│   └── openclaw.cjs
├── skills/
│   └── smart-report/
│       └── SKILL.md
├── docs/
│   └── USER_GUIDE.md
└── scripts/
    └── test-loader.js
```

## Requirement

- OpenClaw terpasang dan bisa menjalankan `openclaw`
- Node.js dan npm tersedia
- Token API Smart Report valid
- Runtime/plugin manager OpenClaw mengizinkan install plugin dari source repository

## Instalasi

### Opsi 1 — dari source repo lokal

Jika repo ini sudah ada di mesin:

```bash
bash install.sh
```

### Opsi 2 — install via OpenClaw plugin manager dari path repo

```bash
openclaw plugins install /path/ke/smart-report-plugin
```

### Opsi 3 — installer via raw GitHub

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh)
```

## Alur installer terbaru

`install.sh` sekarang mengikuti alur berikut:

1. clone repository source
2. menjalankan `npm ci` atau fallback `npm install`
3. build plugin dengan `npm run build`
4. validasi file penting plugin
5. install plugin lewat **official OpenClaw plugin manager**:

```bash
openclaw plugins install <path-repo>
```

6. **tidak fallback** ke copy manual ke `~/.openclaw/extensions`
7. bila gagal karena plugin lama sudah ada, installer akan:
   - backup plugin lama
   - retry install resmi **satu kali**
8. gateway **tidak di-restart otomatis secara default**

Tujuan alur ini adalah menjaga provenance/trust plugin tetap bersih dan menghindari state plugin local yang tidak ter-track.

## Opsi installer

Contoh penggunaan:

```bash
bash install.sh
bash install.sh --branch main
bash install.sh --repo https://github.com/sodikinnaa/smart-report-plugin.git
bash install.sh --token <GITHUB_TOKEN>
bash install.sh --skip-build
bash install.sh --restart
```

Opsi yang tersedia:
- `--repo <url>` → URL git source plugin
- `--branch <name>` → branch/tag yang akan di-clone
- `--target <path>` → reserved untuk diagnostik; bukan jalur manual install utama
- `--token <token>` → GitHub token untuk private repo, atau gunakan env `GITHUB_TOKEN`
- `--skip-build` → lewati `npm install` dan `npm run build`
- `--restart` → restart `openclaw gateway` setelah install
- `--no-restart` → alias legacy; restart tetap di-skip secara default

## Batasan penting install.sh

Perilaku script saat ini:
- **wajib** ada command `git`, `node`, `npm`, dan `openclaw`
- installer ini **hanya mendukung install via OpenClaw plugin manager**
- script **tidak** publish ke npm dan **tidak** install dari package npm
- jika `openclaw` tidak ditemukan, proses akan dihentikan
- jika install via `openclaw plugins install` gagal karena alasan selain plugin lama sudah ada, script akan **stop** dan meminta environment OpenClaw diperbaiki dulu

Artinya, `install.sh` memang sengaja dibuat konservatif supaya tidak menghasilkan plugin local yang untracked atau bermasalah secara provenance.

## Build & test

```bash
npm test
npm run build
```

Script yang tersedia di `package.json`:
- `npm run build`
- `npm test`
- `npm run publish`

## Konfigurasi plugin

Manifest `openclaw.plugin.json` mendeklarasikan config berikut:

- `apiToken`
- `companyName`
- `companyDomain`

Contoh shape config:

```json
{
  "apiToken": "TOKEN_SMART_REPORT",
  "companyName": "Nama Perusahaan",
  "companyDomain": "member.smartreport.my.id"
}
```

## Cara autentikasi

Setelah plugin ter-install, jalankan:

```bash
openclaw smart-auth <TOKEN_ANDA>
```

Perilaku `smart-auth` di code terbaru:
- token disimpan ke `api.pluginConfig` saat runtime berjalan
- plugin mencoba verifikasi token dengan memanggil `company/info`
- jika sukses, plugin menyimpan:
  - `apiToken`
  - `companyName`
  - `companyDomain`
- jika `api.saveConfig()` tersedia, plugin memakai mekanisme save resmi runtime
- jika tidak tersedia, plugin fallback ke update file config OpenClaw yang ditemukan

Candidate config path yang dicoba oleh plugin:
- `~/.openclaw/openclaw.json`
- `~/.openclaw/config.json`
- `/root/.openclaw/openclaw.json`
- `/root/.openclaw/config.json`
- `/etc/openclaw/openclaw.json`
- `/etc/openclaw/config.json`

## Cara cek konektivitas

Untuk health check end-to-end, jalankan:

```bash
openclaw smart-status
```

Status check saat ini menguji method berikut:
- `company/info`
- `smartreport/dashboard`
- `employees/list`
- `reports/list`
- `divisions/list`
- `guides/list`
- `analyze_performance`

Jika ada check gagal, command akan exit dengan status non-zero.

## CLI commands yang tersedia

Plugin saat ini mendaftarkan 2 CLI command:

- `openclaw smart-auth <token>`
- `openclaw smart-status`

## Chat/native commands yang tersedia

Jika runtime OpenClaw mendukung `registerCommand`, plugin akan mendaftarkan command berikut:

- `/smart_status`
- `/smart_dashboard`
- `/smart_employees`
- `/smart_reports`
- `/smart_divisions`
- `/smart_guides`
- `/smart_guide`
- `/smart_analysis`

### Catatan penting nama command

Di code terbaru, nama chat command memakai **underscore**, bukan dash.

Benar:
- `/smart_status`
- `/smart_dashboard`

Bukan:
- `/smart-status`
- `/smart-dashboard`

## Format argumen command

Command chat membaca `ctx.args` lalu mencoba parsing dengan alur berikut:

1. jika kosong → `{}`
2. jika valid JSON object → dipakai langsung
3. jika valid JSON tapi bukan object → dibungkus sebagai `{ "input": ... }`
4. jika bukan JSON → dibungkus sebagai `{ "input": "teks-raw" }`

Contoh:

```text
/smart_reports {"per_page":5}
/smart_guide {"id":12}
/smart_dashboard {"mode":"compact"}
```

## Tools yang didaftarkan

Plugin saat ini mendaftarkan tool berikut:

- `get_daily_dashboard`
- `get_guides_list`
- `get_guide_content`
- `get_list_reports`
- `get_debt_analysis`

Semua tool memanggil backend MCP lalu mengembalikan hasil JSON dalam field `text`.

Catatan:
- tool memang ditujukan untuk **reasoning internal agent**
- output ke user sebaiknya dirapikan terlebih dahulu
- skill `smart-report` sebaiknya dipakai agar agent tidak menampilkan JSON mentah ke user

## Resources yang didaftarkan

Plugin mendaftarkan resource berikut:

- `smartreport://reports`
- `smartreport://employees`
- `smartreport://divisions`
- `smartreport://guides`
- `smartreport://dashboard`

Semua resource saat ini mengembalikan `application/json`.

## Method MCP yang dipakai plugin

Source `src/client.ts` saat ini memanggil endpoint:

```text
https://member.smartreport.my.id/api/mcp
```

Method MCP yang dipakai di berbagai command/resource/tool:
- `company/info`
- `smartreport/dashboard`
- `employees/list`
- `reports/list`
- `divisions/list`
- `guides/list`
- `guides/get`
- `analyze_performance`

## Token resolution flow

Saat melakukan request, plugin mencari token dengan urutan:

1. `api.pluginConfig.apiToken`
2. `api.config.apiToken`
3. `api.config.plugins.entries.smart-report-plugin.config.apiToken`

Jika token tidak ditemukan, plugin akan melempar error:

```text
API token not found. Jalankan "openclaw smart-auth <token>" terlebih dahulu.
```

## Kompatibilitas runtime OpenClaw terbaru

Pada runtime OpenClaw yang lebih baru, command chat/native harus memakai field:
- `handler`
- bukan `execute`

Plugin ini sudah mengikuti pola tersebut dan juga menyetel:
- `acceptsArgs: true`

Selain itu, proses registrasi chat command dibungkus `try/catch` agar kegagalan registrasi tidak ikut menjatuhkan startup plugin secara keseluruhan.

## Verifikasi setelah install

Langkah verifikasi yang direkomendasikan:

```bash
openclaw plugins list --verbose
openclaw smart-auth <TOKEN_SMART_REPORT>
openclaw smart-status
```

Output akhir `install.sh` juga memang mengarahkan verifikasi ke alur ini, lalu menyarankan pengujian chat command bila runtime mendukung native command.

Jika runtime mendukung chat/native command, lanjut uji:

```text
/smart_status
/smart_dashboard {"mode":"compact"}
/smart_reports {"per_page":5}
```

## Troubleshooting

### 1. Plugin gagal install

Cek:

```bash
openclaw plugins list --verbose
openclaw plugins doctor
```

Kemungkinan penyebab:
- trust/provenance plugin belum valid
- plugin lama masih tercatat
- policy OpenClaw menolak install source tertentu

### 2. Auth gagal

Pastikan:
- token valid
- endpoint Smart Report bisa diakses
- backend menerima Bearer token

Ulangi:

```bash
openclaw smart-auth <TOKEN_ANDA>
```

### 3. Command chat tidak muncul

Kemungkinan:
- runtime tidak menyediakan `registerCommand`
- channel/runtime tidak mendukung native command plugin
- ada error registrasi command saat startup

### 4. Tool mengembalikan error

Cek apakah token sudah tersimpan dan method MCP yang dipanggil memang tersedia di backend.

## Manifest & metadata saat ini

`package.json`
- package name: `@sodikinnaa/smart-report-plugin`
- version: `2100.11.6`

`openclaw.plugin.json`
- plugin id: `smart-report-plugin`
- name: `Smart Report Integration`
- version: `2100.11.6`
- entrypoint: `./index.js`

## Catatan desain

- registrasi dipisah per concern: `commands`, `resources`, `tools`, `client`
- `client.ts` menangani auth, persistence config, dan call MCP
- `commands.ts` menangani CLI + chat command
- `resources.ts` expose dataset Smart Report sebagai resource JSON
- `tools.ts` expose method penting untuk reasoning agent
- skill plugin disediakan di folder `./skills`

## Rekomendasi penggunaan

Gunakan:
- **CLI command** untuk setup awal dan health check
- **chat command** untuk akses cepat/manual dari runtime
- **tools** untuk analisis oleh agent
- **skill** untuk merapikan output akhir ke user

Kalau ingin menjaga UX tetap bagus, jangan tampilkan raw JSON ke end-user kecuali memang untuk debugging.