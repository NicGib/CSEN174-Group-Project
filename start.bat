@echo off
REM ================================
REM  TrailMix Dev Environment Start
REM ================================

REM Navigate to backend directory and start FastAPI
echo Starting FastAPI backend...
cd /d "%~dp0backend"
start cmd /k "call \"%~dp0.venv\Scripts\activate.bat" 
start cmd /k "uvicorn main:app --reload""

REM Give backend a few seconds to start up
timeout /t 5 /nobreak >nul

REM Navigate to React Native (Expo) project
echo Starting Expo frontend...
cd /d "%~dp0trailmix"
start cmd /k "npx expo start"

REM Done
echo Both backend and frontend are now running.
