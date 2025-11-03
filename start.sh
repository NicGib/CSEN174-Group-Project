#!/usr/bin/env bash

set -euo pipefail

# Resolve repo root (directory of this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/trailmix"

if [[ ! -d "${BACKEND_DIR}" ]]; then
  echo "[ERROR] backend folder not found at ${BACKEND_DIR}"
  exit 1
fi
if [[ ! -f "${FRONTEND_DIR}/package.json" ]]; then
  echo "[ERROR] trailmix/package.json not found at ${FRONTEND_DIR}"
  exit 1
fi

echo "Starting FastAPI backend..."

# Try to open a new terminal window for backend
open_backend() {
  local cmd="cd '${BACKEND_DIR}' && source '${SCRIPT_DIR}/.venv/bin/activate' 2>/dev/null || true && uvicorn main:app --reload"
  if command -v osascript >/dev/null 2>&1; then
    # macOS Terminal
    osascript -e "tell application \"Terminal\" to do script \"${cmd}\"" || return 1
  elif command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -lc "${cmd}; exec bash" || return 1
  elif command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -e bash -lc "${cmd}; exec bash" || return 1
  elif command -v xterm >/dev/null 2>&1; then
    xterm -hold -e bash -lc "${cmd}" || return 1
  else
    return 1
  fi
}

if ! open_backend; then
  echo "Could not open a new terminal; starting backend in current shell (background)."
  ( cd "${BACKEND_DIR}" && source "${SCRIPT_DIR}/.venv/bin/activate" 2>/dev/null || true && uvicorn main:app --reload ) &
fi

sleep 3

echo "Starting Expo frontend..."

open_frontend() {
  local cmd="cd '${FRONTEND_DIR}' && npx expo start"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "tell application \"Terminal\" to do script \"${cmd}\"" || return 1
  elif command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -lc "${cmd}; exec bash" || return 1
  elif command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -e bash -lc "${cmd}; exec bash" || return 1
  elif command -v xterm >/dev/null 2>&1; then
    xterm -hold -e bash -lc "${cmd}" || return 1
  else
    return 1
  fi
}

if ! open_frontend; then
  echo "Could not open a new terminal; starting frontend in current shell (background)."
  ( cd "${FRONTEND_DIR}" && npx expo start ) &
fi

echo "Both backend and frontend launch commands issued."


