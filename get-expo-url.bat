@echo off
REM Helper script to extract Expo connection URL from frontend container logs

echo Extracting Expo connection URL from frontend logs...
echo.

REM Wait a moment for Expo to start
timeout /t 5 /nobreak >nul

REM Extract exp:// URL from logs
set EXPO_URL=
for /f "delims=" %%k in ('docker logs trailmix-frontend 2^>^&1 ^| findstr /R "exp://"') do (
    REM Extract just the URL using PowerShell
    for /f "delims=" %%u in ('powershell -NoProfile -Command "$line = '%%k'; if ($line -match 'exp://[a-zA-Z0-9.-]+:[0-9]+') { $matches[0] }"') do (
        if not "%%u"=="" (
            set EXPO_URL=%%u
            goto :url_found
        )
    )
)

:url_found
if "!EXPO_URL!"=="" (
    echo Expo connection URL not found yet. Make sure the frontend container is running:
    echo   docker-compose up -d frontend
    echo.
    echo Waiting for Expo to start... (this may take 30-60 seconds)
    echo Run this script again in a moment, or check logs with:
    echo   docker-compose logs -f frontend
    exit /b 1
)

echo ==========================================
echo ^>^>^> EXPO CONNECTION URL ^<^<^<
echo ==========================================
echo.
echo Connection URL: !EXPO_URL!
echo.
echo To connect:
echo 1. Open Expo Go app on your phone
echo 2. Scan the QR code in the logs (run: docker-compose logs frontend)
echo    OR enter this URL manually in Expo Go: !EXPO_URL!
echo.
echo To view the QR code in logs:
echo   docker-compose logs frontend
echo.
echo Or view all frontend logs:
echo   docker-compose logs -f frontend
echo ==========================================

endlocal

