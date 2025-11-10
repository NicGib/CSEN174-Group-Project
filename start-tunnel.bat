@echo off
REM ================================
REM  TrailMix Tunnel Start Script
REM ================================

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend
set FRONTEND_DIR=%SCRIPT_DIR%trailmix
set TUNNEL_LOG=%SCRIPT_DIR%.tunnel-url.log
set TUNNEL_URL_FILE=%SCRIPT_DIR%.tunnel-url

echo Starting TrailMix with Cloudflared Tunnel...

REM Start backend in Docker
echo Starting backend container...
cd /d "%SCRIPT_DIR%"
REM Remove any orphan containers from previous runs
docker-compose down --remove-orphans >nul 2>&1
docker-compose up -d backend

REM Wait for backend to be ready
echo Waiting for backend to be ready...
set BACKEND_READY=0
for /L %%i in (1,1,30) do (
    docker-compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo Backend is ready!
        set BACKEND_READY=1
        goto :backend_ready
    )
    timeout /t 1 /nobreak >nul
)
:backend_ready
if !BACKEND_READY! EQU 0 (
    echo Backend failed to start
    docker-compose logs backend
    exit /b 1
)

REM Check if cloudflared is installed
where cloudflared >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo cloudflared is not installed or not in PATH
    echo Please install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    exit /b 1
)

REM Start cloudflared tunnel in background
echo Starting Cloudflared tunnel...

REM Clean up old log file
if exist "%TUNNEL_LOG%" del "%TUNNEL_LOG%"
if exist "%TUNNEL_URL_FILE%" del "%TUNNEL_URL_FILE%"

REM Start cloudflared in background
start /B "" cloudflared tunnel --url http://localhost:8000 > "%TUNNEL_LOG%" 2>&1

REM Wait for tunnel to initialize
timeout /t 3 /nobreak >nul

REM Extract tunnel URL from log (wait a bit for it to appear)
set TUNNEL_URL=
set MAX_ATTEMPTS=30
set ATTEMPT=0

:wait_for_url
timeout /t 2 /nobreak >nul

REM Use PowerShell to extract URL from log file
if exist "%TUNNEL_LOG%" (
    for /f "delims=" %%k in ('powershell -NoProfile -Command "try { $content = Get-Content '%TUNNEL_LOG%' -Raw; if ($content -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') { $matches[0] } } catch { }"') do (
        if not "%%k"=="" (
            set TUNNEL_URL=%%k
        )
    )
)

REM Check if we found a URL
if not "!TUNNEL_URL!"=="" (
    goto :found_url
)

set /a ATTEMPT+=1
if !ATTEMPT! LSS !MAX_ATTEMPTS! goto :wait_for_url

:found_url
if "!TUNNEL_URL!"=="" (
    echo Failed to get tunnel URL. Check %TUNNEL_LOG% for details.
    if exist "%TUNNEL_LOG%" (
        type "%TUNNEL_LOG%"
    )
    exit /b 1
)

echo Tunnel URL: !TUNNEL_URL!
echo !TUNNEL_URL!> "%TUNNEL_URL_FILE%"

REM Set environment variable for Expo
set EXPO_PUBLIC_API_BASE_URL=!TUNNEL_URL!/api/v1
echo API Base URL: !EXPO_PUBLIC_API_BASE_URL!

REM Start Expo (don't use --tunnel flag, we're using cloudflared)
echo Starting Expo frontend...
echo    The app will use the cloudflared tunnel URL: !TUNNEL_URL!/api/v1
echo    Press Ctrl+C to stop all services.
echo.
cd /d "%FRONTEND_DIR%"
REM Don't use --tunnel flag - we're using cloudflared, not Expo's ngrok
set EXPO_PUBLIC_API_BASE_URL=!TUNNEL_URL!/api/v1
call npx expo start

endlocal


