@echo off
REM Helper script to extract cloudflared tunnel URL from Docker logs
REM Useful when running docker-compose up directly

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set TUNNEL_URL_FILE=%SCRIPT_DIR%.tunnel-url

echo Extracting tunnel URL from cloudflared container...

REM Wait a bit for tunnel to be ready
timeout /t 3 /nobreak >nul

REM Extract URL from docker logs
set TUNNEL_URL=
for /f "delims=" %%k in ('docker logs trailmix-cloudflared 2^>^&1 ^| findstr /R "https://[a-zA-Z0-9-]*\.trycloudflare\.com"') do (
    REM Extract just the URL using PowerShell
    for /f "delims=" %%u in ('powershell -NoProfile -Command "$line = '%%k'; if ($line -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') { $matches[0] }"') do (
        if not "%%u"=="" (
            set TUNNEL_URL=%%u
            goto :url_found
        )
    )
)

:url_found
if "!TUNNEL_URL!"=="" (
    echo Failed to get tunnel URL. Make sure cloudflared container is running:
    echo    docker-compose up -d cloudflared
    exit /b 1
)

echo Tunnel URL: !TUNNEL_URL!
echo !TUNNEL_URL!> "%TUNNEL_URL_FILE%"
echo Written to: %TUNNEL_URL_FILE%
echo.
echo API Base URL: !TUNNEL_URL!/api/v1
echo.
echo You can now start Expo with:
echo   cd trailmix
echo   set EXPO_PUBLIC_API_BASE_URL=!TUNNEL_URL!/api/v1
echo   npx expo start

endlocal

