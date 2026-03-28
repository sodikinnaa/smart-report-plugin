#!/usr/bin/env bash
# install.sh — Repo-only installer for Smart Report Plugin (OpenClaw)
# Usage:
#   bash install.sh
#   bash install.sh --branch main
#   bash install.sh --repo https://github.com/sodikinnaa/smart-report-plugin.git
#   bash install.sh --target /custom/path --no-restart

set -euo pipefail

PLUGIN_ID="smart-report-plugin"
REPO_URL="https://github.com/sodikinnaa/smart-report-plugin.git"
BRANCH="master"
TARGET_DIR="${HOME}/.openclaw/extensions/${PLUGIN_ID}"
SKIP_BUILD="0"
NO_RESTART="1"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
TMP_DIR=""
INSTALL_LOG=""

info()    { echo "  $*"; }
success() { echo "✅ $*"; }
warn()    { echo "⚠️  $*"; }
fatal()   { echo "❌ $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: install.sh [options]

Options:
  --repo <url>       Git repo URL sumber plugin (default: ${REPO_URL})
  --branch <name>    Branch/tag repo yang di-clone (default: ${BRANCH})
  --target <path>    Reserved for diagnostics only (default: ${TARGET_DIR})
  --token <token>    GitHub token untuk private repo (atau GITHUB_TOKEN env)
  --skip-build       Skip npm install/build step
  --restart          Restart openclaw gateway setelah install
  --no-restart       Alias legacy; restart tetap di-skip secara default
  -h, --help         Show this help

Examples:
  bash install.sh
  bash install.sh --branch main
  bash install.sh --repo https://github.com/sodikinnaa/smart-report-plugin.git
  bash install.sh --restart

Catatan:
  Script ini hanya bekerja dari repository/source code.
  Tidak publish ke npmjs dan tidak install dari package npm.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        [[ $# -ge 2 ]] || fatal "Missing value for --repo"
        REPO_URL="$2"; shift 2 ;;
      --branch)
        [[ $# -ge 2 ]] || fatal "Missing value for --branch"
        BRANCH="$2"; shift 2 ;;
      --target)
        [[ $# -ge 2 ]] || fatal "Missing value for --target"
        TARGET_DIR="$2"; shift 2 ;;
      --token)
        [[ $# -ge 2 ]] || fatal "Missing value for --token"
        GITHUB_TOKEN="$2"; shift 2 ;;
      --skip-build)
        SKIP_BUILD="1"; shift ;;
      --restart)
        NO_RESTART="0"; shift ;;
      --no-restart)
        NO_RESTART="1"; shift ;;
      -h|--help)
        usage; exit 0 ;;
      *)
        fatal "Unknown option: $1"
        ;;
    esac
  done
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fatal "Command not found: $1"
}

with_token_repo_url() {
  local url="$1"
  local token="$2"

  if [[ -z "$token" ]]; then
    printf '%s\n' "$url"
    return
  fi

  if [[ "$url" =~ ^https://github.com/ ]]; then
    printf '%s\n' "${url/https:\/\/github.com\//https:\/\/x-access-token:${token}@github.com\/}"
    return
  fi

  printf '%s\n' "$url"
}

cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "${TMP_DIR:-}" ]]; then
    rm -rf "${TMP_DIR}" || true
  fi
}

backup_existing_plugin() {
  local existing_dir="$1"
  local backup_root backup_dir

  backup_root="${HOME}/.openclaw/extensions-backup/${PLUGIN_ID}"
  mkdir -p "$backup_root"
  backup_dir="${backup_root}/$(date +%Y%m%d-%H%M%S)"

  mv "$existing_dir" "$backup_dir"
  success "Backup plugin lama -> ${backup_dir}"
}

should_retry_after_existing_plugin_error() {
  local log_file="$1"

  grep -Fq "plugin already exists: ${TARGET_DIR}" "$log_file"
}

validate_repo() {
  local repo_dir="$1"

  [[ -f "$repo_dir/openclaw.plugin.json" ]] || fatal "openclaw.plugin.json tidak ditemukan"
  [[ -f "$repo_dir/package.json" ]] || fatal "package.json tidak ditemukan"
  [[ -f "$repo_dir/index.js" ]] || fatal "index.js tidak ditemukan"
  [[ -d "$repo_dir/skills" ]] || warn "Folder skills tidak ditemukan"

  if [[ "$SKIP_BUILD" != "1" ]]; then
    [[ -f "$repo_dir/dist/index.js" ]] || fatal "dist/index.js tidak ditemukan setelah build"
  fi
}

main() {
  parse_args "$@"

  need_cmd git
  need_cmd node
  need_cmd npm

  TMP_DIR="$(mktemp -d /tmp/smart-report-plugin-install-XXXXXX)"
  INSTALL_LOG="$TMP_DIR/openclaw-install.log"
  trap cleanup EXIT

  local clone_url
  clone_url="$(with_token_repo_url "$REPO_URL" "$GITHUB_TOKEN")"

  info "Cloning repo..."
  git clone --depth 1 --branch "$BRANCH" "$clone_url" "$TMP_DIR/repo" >/dev/null 2>&1 || fatal "Gagal clone repo: $REPO_URL (branch: $BRANCH)"
  success "Repo cloned (${BRANCH})"

  if [[ "$SKIP_BUILD" != "1" ]]; then
    info "Installing npm dependencies..."
    (cd "$TMP_DIR/repo" && npm ci >/dev/null 2>&1) || (cd "$TMP_DIR/repo" && npm install >/dev/null 2>&1) || fatal "npm install gagal"

    info "Building plugin..."
    if (cd "$TMP_DIR/repo" && npm run build >"$TMP_DIR/build.log" 2>&1); then
      success "Build selesai"
    else
      sed -n '1,160p' "$TMP_DIR/build.log" || true
      fatal "npm run build gagal"
    fi
  else
    warn "Build di-skip (--skip-build)"
  fi

  validate_repo "$TMP_DIR/repo"

  if command -v openclaw >/dev/null 2>&1; then
    info "Installing from repository via OpenClaw plugin manager..."

    if openclaw plugins install "$TMP_DIR/repo" >"$INSTALL_LOG" 2>&1; then
      success "Plugin installed from repository via openclaw plugins install"
    else
      warn "openclaw plugins install dari repository gagal"
      sed -n '1,120p' "$INSTALL_LOG" || true

      if should_retry_after_existing_plugin_error "$INSTALL_LOG"; then
        warn "Ditemukan plugin lama di ${TARGET_DIR}; mencoba backup lalu retry sekali"

        if [[ -d "$TARGET_DIR" ]]; then
          backup_existing_plugin "$TARGET_DIR"
        else
          warn "Log menyebut plugin sudah ada, tetapi direktori target tidak ditemukan saat retry"
        fi

        if openclaw plugins install "$TMP_DIR/repo" >"$INSTALL_LOG" 2>&1; then
          success "Plugin installed from repository after cleaning previous install"
        else
          warn "Retry install masih gagal"
          sed -n '1,120p' "$INSTALL_LOG" || true
          cat <<EOF

❌ Install gagal walau plugin lama sudah dibackup.

Fokus cek berikut:
  1) plugins.allow / trust policy
  2) install records / provenance
  3) config utama OpenClaw bila ada anomaly di openclaw.json
  4) warning keamanan / policy dari OpenClaw untuk plugin ini

Diagnostik cepat:
  - openclaw plugins list --verbose
  - openclaw plugins doctor
  - lihat log install di: $INSTALL_LOG
EOF
          exit 1
        fi
      else
        cat <<EOF

❌ Install dihentikan untuk menghindari manual fallback yang membuat plugin jadi
   untracked local code.

Perbaiki dulu environment OpenClaw, lalu ulangi install. Fokus cek:
  1) plugins.allow / trust policy
  2) install records / provenance
  3) config utama OpenClaw bila ada anomaly di openclaw.json

Diagnostik cepat:
  - openclaw plugins list --verbose
  - openclaw plugins doctor
  - lihat log install di: $INSTALL_LOG

Catatan:
  Script ini sengaja tidak lagi menyalin plugin langsung ke ${TARGET_DIR},
  karena jalur itu memicu warning provenance dan bisa bikin state config makin rancu.
EOF
        exit 1
      fi
    fi
  else
    fatal "openclaw command tidak ditemukan. Installer ini hanya mendukung install via OpenClaw plugin manager dari repository source."
  fi

  if command -v openclaw >/dev/null 2>&1; then
    if [[ "$NO_RESTART" != "1" ]]; then
      info "Restarting OpenClaw gateway..."
      openclaw gateway restart >/dev/null 2>&1 || warn "Gateway restart gagal. Jalankan manual: openclaw gateway restart"
    else
      warn "Restart gateway di-skip secara default untuk menghindari memutus channel aktif (mis. Telegram). Gunakan --restart jika memang ingin restart otomatis."
    fi
  fi

  cat <<EOF

🎉 Instalasi selesai.

Langkah verifikasi:
  1) openclaw plugins list --verbose
  2) Pastikan plugin terdeteksi dari hasil install repository/source
  3) openclaw smart-auth <TOKEN_SMART_REPORT>
  4) openclaw smart-status
  5) Jika runtime mendukung native command chat, uji:
     /smart-status
     /smart-dashboard

Jika masih error:
  - Jalankan: openclaw plugins doctor
  - Cek manifest: ${TARGET_DIR}/openclaw.plugin.json
  - Cek export:   node -e "const m=require('${TARGET_DIR}/dist/index.js'); console.log(typeof m, typeof m.register, typeof m.activate)"
EOF
}

main "$@"
