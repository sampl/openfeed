#!/usr/bin/env bash
set -euo pipefail

# OpenFeed setup script
# Installs or updates OpenFeed from the GitHub repository.
#
# Install (run from any directory):
#   bash scripts/setup.sh
#
# Update (run from inside the cloned repo):
#   bash scripts/setup.sh

REPO_URL="https://github.com/sampl/openfeed.git"
MIN_NODE_MAJOR=18
DEFAULT_INSTALL_DIR="$HOME/openfeed"

# ── Color output (only when stdout is a terminal) ─────────────────────────────

if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  RED='' GREEN='' YELLOW='' BOLD='' RESET=''
fi

log_info()  { printf "  ${BOLD}info${RESET}  %s\n" "$1"; }
log_ok()    { printf "  ${GREEN}ok${RESET}    %s\n" "$1"; }
log_warn()  { printf "  ${YELLOW}warn${RESET}  %s\n" "$1"; }
log_error() { printf "  ${RED}error${RESET} %s\n" "$1" >&2; }

# ── Prerequisite checks ───────────────────────────────────────────────────────

check_node() {
  if ! command -v node &>/dev/null; then
    log_error "Node.js is not installed."
    printf "\n  Install Node.js %d or later:\n" "$MIN_NODE_MAJOR"
    printf "    Linux:  https://github.com/nodesource/distributions\n"
    printf "    macOS:  brew install node  (or https://nodejs.org)\n\n"
    exit 1
  fi

  local version
  version=$(node --version | sed 's/v//')
  local major
  major=$(echo "$version" | cut -d. -f1)

  if [ "$major" -lt "$MIN_NODE_MAJOR" ]; then
    log_error "Node.js $version is too old. Required: $MIN_NODE_MAJOR or later."
    printf "\n  Upgrade Node.js: https://nodejs.org\n\n"
    exit 1
  fi

  log_ok "Node.js $version"
}

check_git() {
  if ! command -v git &>/dev/null; then
    log_error "git is not installed."
    printf "\n  Install git:\n"
    printf "    Linux:  sudo apt install git  (or your distro's package manager)\n"
    printf "    macOS:  brew install git\n\n"
    exit 1
  fi
  log_ok "git $(git --version | awk '{print $3}')"
}

check_npm() {
  if ! command -v npm &>/dev/null; then
    log_error "npm is not available. It should ship with Node.js — try reinstalling Node."
    exit 1
  fi
  log_ok "npm $(npm --version)"
}

# ── Install mode ──────────────────────────────────────────────────────────────

do_install() {
  local install_dir="${1:-$DEFAULT_INSTALL_DIR}"

  printf "\n${BOLD}Installing OpenFeed${RESET}\n\n"

  if [ -d "$install_dir" ] && [ "$(ls -A "$install_dir" 2>/dev/null)" ]; then
    log_error "Directory already exists and is not empty: $install_dir"
    printf "\n  To update an existing install, run this script from inside that directory:\n"
    printf "    cd %s && bash scripts/setup.sh\n\n" "$install_dir"
    exit 1
  fi

  log_info "Cloning into $install_dir ..."
  git clone "$REPO_URL" "$install_dir"
  cd "$install_dir"

  log_info "Installing dependencies ..."
  npm install

  log_info "Building ..."
  npm run build

  print_success_install "$install_dir"
}

# ── Update mode ───────────────────────────────────────────────────────────────

do_update() {
  printf "\n${BOLD}Updating OpenFeed${RESET}\n\n"

  # Safety check: make sure this is the openfeed repo
  if [ ! -f "package.json" ] || ! grep -q '"openfeed"' package.json; then
    log_error "This does not look like the openfeed repository (package.json not found or name mismatch)."
    exit 1
  fi

  # Warn about uncommitted local changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    log_warn "You have uncommitted local changes."
    printf "\n  These will not be lost, but a 'git pull' may conflict with them.\n"
    printf "  Stash them first if needed:  git stash\n\n"
  fi

  local branch
  branch=$(git branch --show-current)
  log_info "Pulling latest changes from origin/$branch ..."

  if ! git pull --ff-only origin "$branch"; then
    log_error "git pull failed. Your local branch may have diverged from origin."
    printf "\n  Resolve manually, then re-run this script.\n\n"
    exit 1
  fi

  log_info "Installing dependencies ..."
  npm install

  log_info "Building ..."
  npm run build

  print_success_update
}

# ── Success banners ───────────────────────────────────────────────────────────

print_success_install() {
  local dir="$1"
  local commit
  commit=$(git -C "$dir" rev-parse --short HEAD 2>/dev/null || echo "unknown")

  printf "\n${GREEN}${BOLD}OpenFeed installed successfully${RESET} (commit %s)\n\n" "$commit"
  printf "  Next steps:\n\n"
  printf "  1. Create a config file:\n"
  printf "       cp %s/examples/basic.yaml %s/openfeed.yaml\n" "$dir" "$dir"
  printf "       # Edit openfeed.yaml to add your feeds\n\n"
  printf "  2. Start the server:\n"
  printf "       cd %s\n" "$dir"
  printf "       node dist/server/main.js\n\n"
  printf "  3. Open http://localhost:3000 in your browser.\n\n"
  printf "  To update later, run:\n"
  printf "    cd %s && bash scripts/setup.sh\n\n" "$dir"
}

print_success_update() {
  local commit
  commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

  printf "\n${GREEN}${BOLD}OpenFeed updated successfully${RESET} (commit %s)\n\n" "$commit"
  printf "  Restart the server to apply changes:\n"
  printf "    node dist/server/main.js\n\n"
}

# ── Entry point ───────────────────────────────────────────────────────────────

main() {
  local install_dir="${1:-$DEFAULT_INSTALL_DIR}"

  printf "\n${BOLD}OpenFeed setup${RESET}\n\n"

  check_node
  check_git
  check_npm

  # If we're inside a git repo, update. Otherwise install fresh.
  if git rev-parse --git-dir &>/dev/null 2>&1; then
    do_update
  else
    do_install "$install_dir"
  fi
}

main "$@"
