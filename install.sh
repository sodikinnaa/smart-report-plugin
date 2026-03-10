#!/usr/bin/env bash
# install.sh — Manual installer for Smart Report Plugin (OpenClaw)
# Usage:
#   bash install.sh
#   bash install.sh --branch master
#   bash install.sh --repo https://github.com/sodikinnaa/smart-report-plugin.git --token <gh_token>

set -euo pipefail

# -----------------------------
# Defaults
# -----------------------------
PLUGIN_ID="smart-report-plugin"
REPO_URL="https://github.com/sodikinnaa/smart-report-plugin.git"
BRANCH="master"
TARGET_DIR="${HOME}/.openclaw/extensions/${PLUGIN_ID}"
SKIP_BUILD="0"
NO_RESTART="0"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# -----------------------------
# UI helpers
# -----------------------------
info()    { echo "  $*"; }
success() { echo "✅ $*"; }
warn()    { echo "⚠️  $*"; }
fatal()   { echo "❌ $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: install.sh [options]

Options:
  --repo <url>       Git repo URL (default: ${REPO_URL})
  --branch <name>    Branch/tag to install (default: ${BRANCH})
  --target <path>    Target plugin dir (default: ${TARGET_DIR})
  --token <token>    GitHub token for private repo (or set GITHUB_TOKEN env)
  --skip-build       Skip npm install/build step
  --no-restart       Skip openclaw gateway restart
  -h, --help         Show this help

Examples:
  bash install.sh
  bash install.sh --branch master
  bash install.sh --repo https://github.com/sodikinnaa/smart-report-plugin.git --token ghp_xxx
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

update_plugins_allow_if_possible() {
  local config_file
  config_file="${HOME}/.openclaw/config.json"

  if [[ ! -f "$config_file" ]]; then
    warn "config.json tidak ditemukan di ${config_file}, skip auto-update plugins.allow"
    return 0
  fi

  node <<'NODE' "$config_file" "$PLUGIN_ID"
const fs = require('fs');
const path = process.argv[2];
const pluginId = process.argv[3];

try {
  const raw = fs.readFileSync(path, 'utf8');
  const cfg = JSON.parse(raw || '{}');

  cfg.plugins = cfg.plugins || {};
  cfg.plugins.allow = Array.isArray(cfg.plugins.allow) ? cfg.plugins.allow : [];

  if (!cfg.plugins.allow.includes(pluginId)) {
    cfg.plugins.allow.push(pluginId);
    fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
    console.log('plugins.allow updated:', pluginId);
  } else {
    console.log('plugins.allow already contains:', pluginId);
  }
} catch (e) {
  console.error('failed to update config.json:', e.message);
  process.exit(1);
}
NODE

  success "plugins.allow disinkronkan untuk ${PLUGIN_ID}"
}

main() {
  parse_args "$@"

  need_cmd git
  need_cmd node
  need_cmd npm

  local tmp_dir
  tmp_dir="$(mktemp -d /tmp/smart-report-plugin-install-XXXXXX)"
  trap 'rm -rf "${tmp_dir}"' EXIT

  local clone_url
  clone_url="$(with_token_repo_url "$REPO_URL" "$GITHUB_TOKEN")"

  info "Cloning repo..."
  git clone --depth 1 --branch "$BRANCH" "$clone_url" "$tmp_dir/repo" >/dev/null 2>&1 || fatal "Gagal clone repo: $REPO_URL (branch: $BRANCH)"
  success "Repo cloned (${BRANCH})"

  if [[ "$SKIP_BUILD" != "1" ]]; then
    info "Installing npm dependencies..."
    (cd "$tmp_dir/repo" && npm ci >/dev/null 2>&1) || (cd "$tmp_dir/repo" && npm install >/dev/null 2>&1) || fatal "npm install gagal"

    info "Building plugin..."
    (cd "$tmp_dir/repo" && npm run build >/dev/null 2>&1) || fatal "npm run build gagal"
    success "Build selesai"
  else
    warn "Build di-skip (--skip-build)"
  fi

  [[ -f "$tmp_dir/repo/openclaw.plugin.json" ]] || fatal "openclaw.plugin.json tidak ditemukan"
  [[ -f "$tmp_dir/repo/dist/openclaw.cjs" ]] || fatal "dist/openclaw.cjs tidak ditemukan"

  info "Verifying register/activate export..."
  node -e "const m=require('$tmp_dir/repo/dist/openclaw.cjs'); const ok=(typeof m==='function'||typeof m.register==='function'||typeof m.activate==='function'); if(!ok){throw new Error('register/activate export not found')} console.log('OK');" >/dev/null || fatal "Plugin export invalid (register/activate tidak ada)"
  success "Export register/activate valid"

  mkdir -p "$(dirname "$TARGET_DIR")"

  if [[ -d "$TARGET_DIR" ]]; then
    local backup_dir
    backup_dir="${TARGET_DIR}.backup.$(date +%Y%m%d-%H%M%S)"
    mv "$TARGET_DIR" "$backup_dir"
    warn "Backup plugin lama -> ${backup_dir}"
  fi

  mkdir -p "$TARGET_DIR"

  # Copy only necessary files
  cp -R \
    "$tmp_dir/repo/openclaw.plugin.json" \
    "$tmp_dir/repo/dist" \
    "$tmp_dir/repo/skills" \
    "$tmp_dir/repo/README.md" \
    "$TARGET_DIR/"

  success "Plugin installed to: ${TARGET_DIR}"

  if command -v openclaw >/dev/null 2>&1; then
    update_plugins_allow_if_possible || warn "Tidak bisa update plugins.allow otomatis"

    if [[ "$NO_RESTART" != "1" ]]; then
      info "Restarting OpenClaw gateway..."
      openclaw gateway restart >/dev/null 2>&1 || warn "Gateway restart gagal. Jalankan manual: openclaw gateway restart"
    else
      warn "Restart di-skip (--no-restart)"
    fi
  else
    warn "openclaw command tidak ditemukan, skip config + restart"
  fi

  cat <<EOF

🎉 Instalasi selesai.

Langkah verifikasi:
  1) openclaw smart-auth <TOKEN_SMART_REPORT>
  2) openclaw smart-status

Jika masih error:
  - Cek entrypoint: ${TARGET_DIR}/openclaw.plugin.json
  - Cek export:    node -e "const m=require('${TARGET_DIR}/dist/openclaw.cjs'); console.log(typeof m, typeof m.register, typeof m.activate)"
EOF
}

main "$@"
