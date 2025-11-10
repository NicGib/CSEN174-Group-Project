@echo off
REM ================================
REM  Cleanup Docker containers and orphaned services
REM ================================

echo Cleaning up Docker containers...

docker-compose down --remove-orphans

echo Cleanup complete!

