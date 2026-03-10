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

cleanup_legacy_backups_in_extensions() {
  local ext_dir="${HOME}/.openclaw/extensions"
  if [[ -d "$ext_dir" ]]; then
    find "$ext_dir" -maxdepth 1 -type d -name "${PLUGIN_ID}.backup.*" -print0 2>/dev/null | while IFS= read -r -d '' d; do
      rm -rf "$d" || true
      warn "Removed legacy backup inside extensions: $d"
    done
  fi
}

sync_openclaw_plugin_config() {
  local plugin_id="$1"
  local found_any="0"

  # Candidate locations across common OpenClaw setups (prioritize openclaw.json)
  local candidates=(
    "${HOME}/.openclaw/openclaw.json"
    "/root/.openclaw/openclaw.json"
    "/etc/openclaw/openclaw.json"
    "${HOME}/.openclaw/config.json"
    "${HOME}/.config/openclaw/config.json"
    "/root/.openclaw/config.json"
    "/root/.config/openclaw/config.json"
    "/etc/openclaw/config.json"
  )

  # Also discover additional openclaw*.json files (depth-limited, safe)
  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    candidates+=("$f")
  done < <(find /root /etc -maxdepth 6 -type f \( -name 'openclaw.json' -o -name 'config.json' \) -path '*openclaw*' 2>/dev/null | sort -u)

  # De-duplicate candidates
  local uniq=()
  local c
  for c in "${candidates[@]}"; do
    [[ -n "$c" ]] || continue
    if [[ ! " ${uniq[*]} " =~ " ${c} " ]]; then
      uniq+=("$c")
    fi
  done

  for cfg in "${uniq[@]}"; do
    [[ -f "$cfg" ]] || continue
    found_any="1"

    node <<'NODE' "$cfg" "$plugin_id"
const fs = require('fs');
const cfgPath = process.argv[2];
const pluginId = process.argv[3];

try {
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const cfg = JSON.parse(raw || '{}');

  cfg.plugins = cfg.plugins || {};

  // 1) pin trust allowlist
  cfg.plugins.allow = Array.isArray(cfg.plugins.allow) ? cfg.plugins.allow : [];
  if (!cfg.plugins.allow.includes(pluginId)) cfg.plugins.allow.push(pluginId);

  // 2) clean stale install record, then ensure plugin entry is explicitly enabled
  if (cfg.plugins.installs && typeof cfg.plugins.installs === 'object') {
    delete cfg.plugins.installs[pluginId];
  }
  cfg.plugins.entries = cfg.plugins.entries || {};
  const prevEntry = (cfg.plugins.entries[pluginId] && typeof cfg.plugins.entries[pluginId] === 'object')
    ? cfg.plugins.entries[pluginId]
    : {};
  cfg.plugins.entries[pluginId] = {
    ...prevEntry,
    enabled: true,
    config: (prevEntry.config && typeof prevEntry.config === 'object') ? prevEntry.config : {}
  };

  // 3) force discovery path for manual fallback installs
  cfg.plugins.load = cfg.plugins.load || {};
  cfg.plugins.load.paths = Array.isArray(cfg.plugins.load.paths) ? cfg.plugins.load.paths : [];
  const manualPath = `${process.env.HOME || '/root'}/.openclaw/extensions/${pluginId}`;
  if (!cfg.plugins.load.paths.includes(manualPath)) cfg.plugins.load.paths.push(manualPath);

  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  console.log('synced plugin config:', cfgPath);
} catch (e) {
  console.error('failed to sync config', cfgPath, e.message);
  process.exit(1);
}
NODE
  done

  if [[ "$found_any" == "1" ]]; then
    success "Konfigurasi plugin disinkronkan (allowlist + stale cleanup)"
  else
    warn "Tidak menemukan config OpenClaw; skip sync config otomatis"
  fi
}

TMP_DIR=""
cleanup() {
  if [[ -n "${TMP_DIR:-}" && -d "${TMP_DIR:-}" ]]; then
    rm -rf "${TMP_DIR}" || true
  fi
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

  [[ -f "$TMP_DIR/repo/openclaw.plugin.json" ]] || fatal "openclaw.plugin.json tidak ditemukan"
  [[ -f "$TMP_DIR/repo/index.js" ]] || fatal "index.js tidak ditemukan"
  [[ -f "$TMP_DIR/repo/dist/index.js" ]] || fatal "dist/index.js tidak ditemukan"

  info "Verifying register/activate export..."
  node -e "const m=require('$TMP_DIR/repo/index.js'); const ok=(typeof m==='function'||typeof m.register==='function'||typeof m.activate==='function'); if(!ok){throw new Error('register/activate export not found')} console.log('OK');" >/dev/null || fatal "Plugin export invalid (register/activate tidak ada)"
  success "Export register/activate valid"

  mkdir -p "$(dirname "$TARGET_DIR")"

  # Preferred path: let OpenClaw register install metadata itself.
  if command -v openclaw >/dev/null 2>&1; then
    info "Installing via OpenClaw plugin manager..."

    # Remove stale install record if present (safe if plugin not installed)
    if command -v timeout >/dev/null 2>&1; then
      timeout 20 openclaw plugins uninstall "$PLUGIN_ID" >/dev/null 2>&1 || true
    else
      openclaw plugins uninstall "$PLUGIN_ID" >/dev/null 2>&1 || true
    fi

    # Install from local prepared repo path (contains built dist)
    # Remove existing dir first to avoid "plugin already exists" hard-fail.
    rm -rf "$TARGET_DIR" >/dev/null 2>&1 || true

    local install_ok="0"
    local install_log="$TMP_DIR/openclaw-install.log"
    if command -v timeout >/dev/null 2>&1; then
      if timeout 45 openclaw plugins install "$TMP_DIR/repo" >"$install_log" 2>&1; then
        install_ok="1"
      else
        warn "openclaw plugins install timeout/gagal (>45s), fallback ke manual copy"
        sed -n '1,80p' "$install_log" || true
      fi
    else
      if openclaw plugins install "$TMP_DIR/repo" >"$install_log" 2>&1; then
        install_ok="1"
      else
        warn "openclaw plugins install gagal, fallback ke manual copy"
        sed -n '1,80p' "$install_log" || true
      fi
    fi

    if [[ "$install_ok" == "1" ]]; then
      success "Plugin installed via openclaw plugins install"

      # Validate installed artifact, because some OpenClaw versions may resolve stale package contents.
      if ! node -e "const p='$TARGET_DIR/dist/index.js'; const m=require(p); const ok=(typeof m.register==='function'||typeof m.activate==='function'||typeof m==='function'); if(!ok) process.exit(1);" >/dev/null 2>&1; then
        warn "Installed artifact invalid (register/activate not found), forcing manual overwrite from built source"
        install_ok="0"
      fi
    fi

    if [[ "$install_ok" != "1" ]]; then
      if [[ -d "$TARGET_DIR" ]]; then
        local backup_root backup_dir
        backup_root="${HOME}/.openclaw/extensions-backup/${PLUGIN_ID}"
        mkdir -p "$backup_root"
        backup_dir="${backup_root}/$(date +%Y%m%d-%H%M%S)"
        mv "$TARGET_DIR" "$backup_dir"
        warn "Backup plugin lama -> ${backup_dir}"
      fi

      mkdir -p "$TARGET_DIR"
      cp -R \
        "$TMP_DIR/repo/openclaw.plugin.json" \
        "$TMP_DIR/repo/package.json" \
        "$TMP_DIR/repo/package-lock.json" \
        "$TMP_DIR/repo/index.js" \
        "$TMP_DIR/repo/dist" \
        "$TMP_DIR/repo/src" \
        "$TMP_DIR/repo/skills" \
        "$TMP_DIR/repo/README.md" \
        "$TARGET_DIR/"

      (cd "$TARGET_DIR" && npm install --omit=dev >/dev/null 2>&1) || warn "npm install dependency plugin gagal"
      success "Plugin installed to: ${TARGET_DIR}"
    fi
  else
    # Fallback for environments without openclaw CLI in PATH.
    if [[ -d "$TARGET_DIR" ]]; then
      local backup_root backup_dir
      backup_root="${HOME}/.openclaw/extensions-backup/${PLUGIN_ID}"
      mkdir -p "$backup_root"
      backup_dir="${backup_root}/$(date +%Y%m%d-%H%M%S)"
      mv "$TARGET_DIR" "$backup_dir"
      warn "Backup plugin lama -> ${backup_dir}"
    fi

    mkdir -p "$TARGET_DIR"
    cp -R \
      "$TMP_DIR/repo/openclaw.plugin.json" \
      "$TMP_DIR/repo/package.json" \
      "$TMP_DIR/repo/package-lock.json" \
      "$TMP_DIR/repo/index.js" \
      "$TMP_DIR/repo/dist" \
      "$TMP_DIR/repo/skills" \
      "$TMP_DIR/repo/README.md" \
      "$TARGET_DIR/"

    (cd "$TARGET_DIR" && npm install --omit=dev >/dev/null 2>&1) || warn "npm install dependency plugin gagal"
    success "Plugin installed to: ${TARGET_DIR}"
  fi

  cleanup_legacy_backups_in_extensions

  if command -v openclaw >/dev/null 2>&1; then
    sync_openclaw_plugin_config "$PLUGIN_ID" || warn "Tidak bisa sinkronisasi config otomatis"

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
  1) openclaw plugins list --verbose
  2) openclaw smart-auth <TOKEN_SMART_REPORT>
  3) openclaw smart-status

Jika masih error:
  - Jalankan: openclaw plugins doctor
  - Cek entrypoint: ${TARGET_DIR}/openclaw.plugin.json
  - Cek export:    node -e "const m=require('${TARGET_DIR}/dist/index.js'); console.log(typeof m, typeof m.register, typeof m.activate)"
EOF
}

main "$@"
