@echo off
REM ================================
REM  TrailMix Docker Tunnel Start Script
REM  All services run in Docker containers
REM ================================

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set FRONTEND_DIR=%SCRIPT_DIR%trailmix
set TUNNEL_URL_FILE=%SCRIPT_DIR%.tunnel-url

echo Starting TrailMix with Docker and Cloudflared Tunnel...

REM Start all services in Docker
echo Starting Docker containers...
cd /d "%SCRIPT_DIR%"
docker-compose down --remove-orphans >nul 2>&1
REM Clean up old tunnel URL files to ensure fresh start
if exist "%TUNNEL_URL_FILE%" del /q "%TUNNEL_URL_FILE%"
if exist "%FRONTEND_DIR%\.tunnel-url" del /q "%FRONTEND_DIR%\.tunnel-url"
REM Start backend and cloudflared first, then frontend will start after tunnel URL is extracted
docker-compose up -d backend cloudflared

REM Wait for backend to be ready
echo Waiting for backend to be ready...
timeout /t 5 /nobreak >nul

REM Extract tunnel URL from cloudflared logs
set TUNNEL_URL=
set MAX_ATTEMPTS=30
set ATTEMPT=0

:wait_for_url
timeout /t 2 /nobreak >nul

REM Extract URL from docker logs
for /f "delims=" %%k in ('docker logs trailmix-cloudflared 2^>^&1 ^| findstr /R "https://[a-zA-Z0-9-]*\.trycloudflare\.com"') do (
    REM Extract just the URL using PowerShell
    for /f "delims=" %%u in ('powershell -NoProfile -Command "$line = '%%k'; if ($line -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') { $matches[0] }"') do (
        if not "%%u"=="" (
            set TUNNEL_URL=%%u
            goto :url_found
        )
    )
)

set /a ATTEMPT+=1
if !ATTEMPT! LSS !MAX_ATTEMPTS! goto :wait_for_url

:url_found
if "!TUNNEL_URL!"=="" (
    echo Failed to get tunnel URL. Check cloudflared logs:
    docker logs trailmix-cloudflared
    exit /b 1
)

echo Tunnel URL: !TUNNEL_URL!
echo !TUNNEL_URL!> "%TUNNEL_URL_FILE%"
REM Also update trailmix/.tunnel-url for app.config.js
echo !TUNNEL_URL!> "%FRONTEND_DIR%\.tunnel-url"

REM Set environment variable for frontend container
set EXPO_PUBLIC_API_BASE_URL=!TUNNEL_URL!/api/v1
echo API Base URL: !EXPO_PUBLIC_API_BASE_URL!
echo Updated tunnel URL files: %TUNNEL_URL_FILE% and %FRONTEND_DIR%\.tunnel-url
echo.

REM Option 1: Start frontend container in Docker
REM Uncomment the lines below if you want the frontend to run in Docker
REM echo Starting frontend container...
REM docker-compose up -d frontend
REM echo Frontend container started. View logs with: docker-compose logs -f frontend

REM Option 2: Start Expo locally (better for development - hot reload, easier debugging)
echo Starting Expo frontend locally...
echo    The app will use the cloudflared tunnel URL: !TUNNEL_URL!/api/v1
echo    Press Ctrl+C to stop all services.
echo.
cd /d "%FRONTEND_DIR%"
set EXPO_PUBLIC_API_BASE_URL=!TUNNEL_URL!/api/v1
call npx expo start --lan -c

endlocal

