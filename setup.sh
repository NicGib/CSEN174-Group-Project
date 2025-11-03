#!/usr/bin/env bash

set -euo pipefail

# Resolve repo root (directory of this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo
echo "======================================"
echo " TrailMix Development Setup (macOS/Linux)"
echo "======================================"
echo

# ---- Check Python ----
if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 not found. Install Python 3."
  exit 1
fi

# ---- Check pip ----
if ! python3 -m pip --version >/dev/null 2>&1; then
  echo "[ERROR] pip for Python 3 not available. Try: python3 -m ensurepip --upgrade"
  exit 1
fi

# ---- Check npm ----
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm not found. Install Node.js (includes npm)."
  exit 1
fi

# ---- Backend: create/activate ROOT venv and install deps ----
BACKEND_DIR="${SCRIPT_DIR}/backend"
if [[ ! -d "${BACKEND_DIR}" ]]; then
  echo "[ERROR] backend folder not found at ${BACKEND_DIR}"
  exit 1
fi

VENV_DIR="${SCRIPT_DIR}/.venv"
if [[ ! -f "${VENV_DIR}/bin/activate" ]]; then
  echo "Creating virtual environment at repo root..."
  python3 -m venv "${VENV_DIR}"
fi

source "${VENV_DIR}/bin/activate"
echo "Installing backend dependencies..."
pip install -r "${BACKEND_DIR}/requirements.txt"

# ---- Frontend: install deps in trailmix ----
FRONTEND_DIR="${SCRIPT_DIR}/trailmix"
if [[ ! -f "${FRONTEND_DIR}/package.json" ]]; then
  echo "[ERROR] trailmix/package.json not found at ${FRONTEND_DIR}"
  exit 1
fi

echo "Installing frontend dependencies..."
cd "${FRONTEND_DIR}"
npm install

echo
echo "======================================"
echo " Setup complete! Backend and frontend deps installed."
echo "======================================"


