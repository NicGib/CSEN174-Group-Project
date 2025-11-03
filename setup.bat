@echo off
setlocal EnableExtensions

echo.
echo ======================================
echo  TrailMix Development Setup
echo ======================================
echo.

REM ---- Check Python ----
where python >nul 2>&1
if errorlevel 1 goto no_python

REM ---- Check pip (via Python) ----
python -m pip --version >nul 2>&1
if errorlevel 1 goto no_pip

REM ---- Check npm ----
where npm >nul 2>&1
if errorlevel 1 goto no_npm

REM ---- Backend: verify folder exists ----
if not exist "%~dp0backend" goto no_backend

REM ---- Ensure/activate root .venv ----
if exist "%~dp0.venv\Scripts\activate.bat" goto have_root_venv

echo Creating virtual environment at repo root...
python -m venv "%~dp0.venv"
if errorlevel 1 goto venv_fail

:have_root_venv
call "%~dp0.venv\Scripts\activate.bat"
if errorlevel 1 goto venv_act_fail

echo Installing backend dependencies (no pip self-upgrade)...
pip install -r "%~dp0backend\requirements.txt"
if errorlevel 1 goto pip_install_fail

echo Checking trailmix directory...
if not exist "%~dp0trailmix\package.json" goto no_trailmix

echo Installing frontend dependencies in a new window...
cd /d "%~dp0trailmix"
start cmd /k "npm install"

echo.
echo ======================================
echo  Setup complete!
echo  Backend and frontend deps installed.
echo ======================================
exit /b 0


:no_python
echo [ERROR] Python not found.
echo Install from https://www.python.org/downloads/ and check "Add Python to PATH".
goto end_error

:no_pip
echo [ERROR] pip not available.
echo Try:  python -m ensurepip
echo Or reinstall Python and enable "Add Python to PATH".
goto end_error

:no_npm
echo [ERROR] npm not found.
echo Install Node.js (includes npm): https://nodejs.org/
goto end_error

:no_backend
echo [ERROR] backend folder not found at "%~dp0backend"
goto end_error

:venv_fail
echo [ERROR] Failed to create .venv
goto end_error

:venv_act_fail
echo [ERROR] Failed to activate .venv
goto end_error

:pip_install_fail
echo [ERROR] pip install -r requirements.txt failed
goto end_error

:no_trailmix
echo [ERROR] trailmix folder not found at "%~dp0trailmix"
goto end_error

:npm_install_fail
echo [ERROR] npm install failed
goto end_error

:end_error
echo.
echo Setup did not complete due to the error above.
exit /b 1
