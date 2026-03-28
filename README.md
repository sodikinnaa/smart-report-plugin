# Smart Report Plugin for OpenClaw

Plugin integrasi OpenClaw untuk menghubungkan agent dengan ekosistem **Smart Report** melalui command, resources, tools, dan skill plugin.

## Ringkasan kemampuan

Plugin ini menyediakan:
- **CLI command** untuk autentikasi dan health check
- **Resources** untuk data dashboard, karyawan, divisi, guides, dan laporan
- **Agent tools** untuk analisis dan query Smart Report
- **Plugin skill** untuk memandu formatting output agar tidak menampilkan JSON mentah ke user

## Struktur plugin

```text
smart-report-plugin/
├── package.json
├── openclaw.plugin.json
├── index.js
├── src/
│   ├── client.ts
│   ├── commands.ts
│   ├── resources.ts
│   ├── tools.ts
│   └── index.ts
├── dist/
├── skills/
│   └── smart-report/
│       └── SKILL.md
├── docs/
│   └── USER_GUIDE.md
└── scripts/
    └── test-loader.js
```

## Instalasi

### Installer utama via raw GitHub
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/sodikinnaa/smart-report-plugin/master/install.sh)
```

### Dari repository lokal
```bash
bash install.sh
```

Atau install langsung dari source repository:

```bash
openclaw plugins install /path/ke/repo/smart-report-plugin
```

## Konfigurasi

Plugin menyimpan konfigurasi berikut setelah autentikasi berhasil:
- `apiToken`
- `companyDomain`
- `companyName` *(optional)*

Konfigurasi tidak perlu dipaksa ada saat proses install awal.

Setelah instalasi, autentikasi token dengan:

```bash
openclaw smart-auth <TOKEN_ANDA>
```

Untuk mengecek konektivitas backend dan method inti:

```bash
openclaw smart-status
```

## Tools yang didaftarkan

- `get_daily_dashboard`
- `get_guides_list`
- `get_guide_content`
- `get_list_reports`
- `get_debt_analysis`

Catatan: tool mengembalikan JSON untuk reasoning internal agent. Output ke user sebaiknya diformat melalui skill `smart-report`.

## Resources yang didaftarkan

- `smartreport://dashboard`
- `smartreport://employees`
- `smartreport://reports`
- `smartreport://divisions`
- `smartreport://guides`

## Validasi minimum

Sebelum handoff/install, jalankan:

```bash
npm test
npm run build
```

## Catatan desain

- Struktur plugin sudah dipisah per responsibility: `commands`, `resources`, `tools`, `client`
- Konfigurasi disimpan melalui runtime `saveConfig()` bila tersedia
- Manifest memakai `configSchema` yang strict (`additionalProperties: false`)
- Skill plugin dideklarasikan melalui folder `./skills`
