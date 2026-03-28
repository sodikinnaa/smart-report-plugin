#!/usr/bin/env bash
# install.sh — Safe installer for Smart Report Plugin (OpenClaw)
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
NO_RESTART="0"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
TMP_DIR=""

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
  bash install.sh --branch main
  bash install.sh --repo https://github.com/sodikinnaa/smart-report-plugin.git
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

cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "${TMP_DIR:-}" ]]; then
    rm -rf "${TMP_DIR}" || true
  fi
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

manual_install() {
  local repo_dir="$1"

  warn "Fallback ke manual install ke ${TARGET_DIR}"

  mkdir -p "$(dirname "$TARGET_DIR")"
  rm -rf "$TARGET_DIR"
  mkdir -p "$TARGET_DIR"

  cp -R \
    "$repo_dir/openclaw.plugin.json" \
    "$repo_dir/package.json" \
    "$repo_dir/index.js" \
    "$repo_dir/dist" \
    "$repo_dir/skills" \
    "$repo_dir/README.md" \
    "$TARGET_DIR/"

  if [[ -f "$repo_dir/package-lock.json" ]]; then
    cp "$repo_dir/package-lock.json" "$TARGET_DIR/"
  fi

  (cd "$TARGET_DIR" && npm install --omit=dev >/dev/null 2>&1) || warn "npm install dependency plugin gagal"
  success "Plugin terpasang secara manual di: ${TARGET_DIR}"
}

main() {
  parse_args "$@"

  need_cmd git
  need_cmd node
  need_cmd npm

  TMP_DIR="$(mktemp -d /tmp/smart-report-plugin-install-XXXXXX)"
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
    (cd "$TMP_DIR/repo" && npm run build >/dev/null 2>&1) || fatal "npm run build gagal"
    success "Build selesai"
  else
    warn "Build di-skip (--skip-build)"
  fi

  validate_repo "$TMP_DIR/repo"

  if command -v openclaw >/dev/null 2>&1; then
    info "Installing via OpenClaw plugin manager..."

    if openclaw plugins install "$TMP_DIR/repo" >/tmp/${PLUGIN_ID}-install.log 2>&1; then
      success "Plugin installed via openclaw plugins install"
    else
      warn "openclaw plugins install gagal, mencoba fallback manual"
      sed -n '1,80p' /tmp/${PLUGIN_ID}-install.log || true
      manual_install "$TMP_DIR/repo"
    fi
  else
    warn "openclaw command tidak ditemukan, menggunakan manual install"
    manual_install "$TMP_DIR/repo"
  fi

  if command -v openclaw >/dev/null 2>&1; then
    if [[ "$NO_RESTART" != "1" ]]; then
      info "Restarting OpenClaw gateway..."
      openclaw gateway restart >/dev/null 2>&1 || warn "Gateway restart gagal. Jalankan manual: openclaw gateway restart"
    else
      warn "Restart di-skip (--no-restart)"
    fi
  fi

  cat <<EOF

🎉 Instalasi selesai.

Langkah verifikasi:
  1) openclaw plugins list --verbose
  2) openclaw smart-auth <TOKEN_SMART_REPORT>
  3) openclaw smart-status

Jika masih error:
  - Jalankan: openclaw plugins doctor
  - Cek manifest: ${TARGET_DIR}/openclaw.plugin.json
  - Cek export:   node -e "const m=require('${TARGET_DIR}/dist/index.js'); console.log(typeof m, typeof m.register, typeof m.activate)"
EOF
}

main "$@"
