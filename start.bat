@echo off
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set CURRENT_WINDOW_TITLE=TrailMix_None
set CURRENT_MODE=None

:menu
cls
echo ========================================
echo   TrailMix Master Start Script
echo ========================================
echo.
echo   Select an option:
echo.
echo   1. Start with Tunnel Mode (cloudflared + Expo tunnel)
echo   2. Start with LAN Mode (cloudflared + Expo LAN)
echo   3. Start Local Mode (cloudflared + Expo local)
echo   4. Direct Docker Mode
echo   5. Stop Current and Exit
echo.
echo   Current: !CURRENT_MODE!
echo.

choice /C 12345 /N /M "Select option (1-5): "
if errorlevel 5 goto :stop_and_exit
if errorlevel 4 goto :direct_docker_mode
if errorlevel 3 goto :option3
if errorlevel 2 goto :option2
if errorlevel 1 goto :option1
goto :menu

:option1
call :stop_current
set CURRENT_MODE=Tunnel Mode
set CURRENT_WINDOW_TITLE=TrailMix_Tunnel
echo.
echo Starting Tunnel Mode in new window...
start "!CURRENT_WINDOW_TITLE!" cmd /k ""%SCRIPT_DIR%start-tunnel-docker.bat""
timeout /t 2 /nobreak >nul
goto :menu

:option2
call :stop_current
set CURRENT_MODE=LAN Mode
set CURRENT_WINDOW_TITLE=TrailMix_LAN
echo.
echo Starting LAN Mode in new window...
start "!CURRENT_WINDOW_TITLE!" cmd /k ""%SCRIPT_DIR%start-lan-docker.bat""
timeout /t 2 /nobreak >nul
goto :menu

:option3
call :stop_current
set CURRENT_MODE=Local Mode
set CURRENT_WINDOW_TITLE=TrailMix_Local
echo.
echo Starting Local Mode in new window...
start "!CURRENT_WINDOW_TITLE!" cmd /k ""%SCRIPT_DIR%start-docker.bat""
timeout /t 2 /nobreak >nul
goto :menu

:direct_docker_mode
:docker_menu
cls
echo ========================================
echo   Direct Docker Mode
echo ========================================
echo.
echo   Select an option:
echo.
echo   1. Manage All Containers
echo   2. Manage Individual Container
echo   3. View Container Status
echo   4. View Container Logs
echo   5. Back to Main Menu
echo.
choice /C 12345 /N /M "Select option (1-5): "
if errorlevel 5 goto :menu
if errorlevel 4 goto :view_logs
if errorlevel 3 goto :view_status
if errorlevel 2 goto :manage_individual
if errorlevel 1 goto :manage_all
goto :docker_menu

:manage_all
cls
echo ========================================
echo   Manage All Containers
echo ========================================
echo.
echo   1. Restart All Containers
echo   2. Start All Containers
echo   3. Stop All Containers
echo   4. Back
echo.
choice /C 1234 /N /M "Select option (1-4): "
if errorlevel 4 goto :docker_menu
if errorlevel 3 goto :stop_all_containers
if errorlevel 2 goto :start_all_containers
if errorlevel 1 goto :restart_all_containers
goto :manage_all

:restart_all_containers
echo Restarting all Docker containers...
cd /d "%SCRIPT_DIR%"
docker-compose down --remove-orphans
docker-compose up -d
echo.
echo Press any key to continue...
pause >nul
goto :docker_menu

:start_all_containers
echo Starting all Docker containers...
cd /d "%SCRIPT_DIR%"
docker-compose up -d
echo.
echo Press any key to continue...
pause >nul
goto :docker_menu

:stop_all_containers
echo Stopping all Docker containers...
cd /d "%SCRIPT_DIR%"
docker-compose down --remove-orphans
echo.
echo Press any key to continue...
pause >nul
goto :docker_menu

:manage_individual
cls
echo ========================================
echo   Manage Individual Container
echo ========================================
echo.
echo   Select container:
echo.
echo   1. postgres
echo   2. redis
echo   3. backend
echo   4. cloudflared
echo   5. frontend
echo   6. tunnel-url-extractor
echo   7. Back
echo.
choice /C 1234567 /N /M "Select container (1-7): "
if errorlevel 7 goto :docker_menu
if errorlevel 6 goto :select_tunnel_extractor
if errorlevel 5 goto :select_frontend
if errorlevel 4 goto :select_cloudflared
if errorlevel 3 goto :select_backend
if errorlevel 2 goto :select_redis
if errorlevel 1 goto :select_postgres
goto :manage_individual

:select_postgres
set CONTAINER_NAME=postgres
goto :container_actions

:select_redis
set CONTAINER_NAME=redis
goto :container_actions

:select_backend
set CONTAINER_NAME=backend
goto :container_actions

:select_cloudflared
set CONTAINER_NAME=cloudflared
goto :container_actions

:select_frontend
set CONTAINER_NAME=frontend
goto :container_actions

:select_tunnel_extractor
set CONTAINER_NAME=tunnel-url-extractor
goto :container_actions

:container_actions
cls
echo ========================================
echo   Manage: !CONTAINER_NAME!
echo ========================================
echo.
echo   1. Restart Container
echo   2. Start Container
echo   3. Stop Container
echo   4. View Logs
echo   5. Back
echo.
choice /C 12345 /N /M "Select action (1-5): "
if errorlevel 5 goto :manage_individual
if errorlevel 4 goto :view_container_logs
if errorlevel 3 goto :stop_container
if errorlevel 2 goto :start_container
if errorlevel 1 goto :restart_container
goto :container_actions

:restart_container
echo Restarting !CONTAINER_NAME!...
cd /d "%SCRIPT_DIR%"
docker-compose restart !CONTAINER_NAME!
echo.
echo Press any key to continue...
pause >nul
goto :container_actions

:start_container
echo Starting !CONTAINER_NAME!...
cd /d "%SCRIPT_DIR%"
docker-compose up -d !CONTAINER_NAME!
echo.
echo Press any key to continue...
pause >nul
goto :container_actions

:stop_container
echo Stopping !CONTAINER_NAME!...
cd /d "%SCRIPT_DIR%"
docker-compose stop !CONTAINER_NAME!
echo.
echo Press any key to continue...
pause >nul
goto :container_actions

:view_container_logs
echo Viewing logs for !CONTAINER_NAME!...
echo Press Ctrl+C to return to menu
cd /d "%SCRIPT_DIR%"
docker-compose logs -f !CONTAINER_NAME!
goto :container_actions

:view_status
cls
echo ========================================
echo   Container Status
echo ========================================
echo.
cd /d "%SCRIPT_DIR%"
docker-compose ps
echo.
echo Press any key to continue...
pause >nul
goto :docker_menu

:view_logs
cls
echo ========================================
echo   View Container Logs
echo ========================================
echo.
echo   Select container:
echo.
echo   1. postgres
echo   2. redis
echo   3. backend
echo   4. cloudflared
echo   5. frontend
echo   6. tunnel-url-extractor
echo   7. all (all containers)
echo   8. Back
echo.
choice /C 12345678 /N /M "Select container (1-8): "
if errorlevel 8 goto :docker_menu
if errorlevel 7 goto :logs_all
if errorlevel 6 goto :logs_tunnel_extractor
if errorlevel 5 goto :logs_frontend
if errorlevel 4 goto :logs_cloudflared
if errorlevel 3 goto :logs_backend
if errorlevel 2 goto :logs_redis
if errorlevel 1 goto :logs_postgres
goto :view_logs

:logs_postgres
set LOG_CONTAINER=postgres
goto :show_logs

:logs_redis
set LOG_CONTAINER=redis
goto :show_logs

:logs_backend
set LOG_CONTAINER=backend
goto :show_logs

:logs_cloudflared
set LOG_CONTAINER=cloudflared
goto :show_logs

:logs_frontend
set LOG_CONTAINER=frontend
goto :show_logs

:logs_tunnel_extractor
set LOG_CONTAINER=tunnel-url-extractor
goto :show_logs

:logs_all
set LOG_CONTAINER=
goto :show_logs

:show_logs
echo Viewing logs...
echo Press Ctrl+C to return to menu
cd /d "%SCRIPT_DIR%"
if "!LOG_CONTAINER!"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f !LOG_CONTAINER!
)
goto :view_logs

:stop_current
if not "!CURRENT_WINDOW_TITLE!"=="TrailMix_None" (
    echo Stopping current process...
    taskkill /FI "WINDOWTITLE eq !CURRENT_WINDOW_TITLE!*" /F >nul 2>&1
    timeout /t 1 /nobreak >nul
    set CURRENT_WINDOW_TITLE=TrailMix_None
    set CURRENT_MODE=None
)
exit /b

:stop_and_exit
call :stop_current
echo Stopping Docker containers...
cd /d "%SCRIPT_DIR%"
docker-compose down --remove-orphans >nul 2>&1
goto :exit

:exit
echo.
echo Exiting...
endlocal
exit /b 0

