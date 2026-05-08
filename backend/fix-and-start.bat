@echo off
echo ========================================
echo   Fixing Backend Dependencies
echo ========================================
echo.

echo Step 1: Removing old node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f package-lock.json
echo Done!
echo.

echo Step 2: Installing dependencies...
call npm install
echo Done!
echo.

echo Step 3: Starting backend...
call npm run dev
