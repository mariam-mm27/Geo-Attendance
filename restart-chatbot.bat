@echo off
echo ========================================
echo   Restarting Geo-Attendance System
echo ========================================
echo.

echo Step 1: Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)
echo Done!
echo.

echo Step 2: Killing processes on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a 2>nul
)
echo Done!
echo.

echo ========================================
echo   Processes killed successfully!
echo ========================================
echo.
echo Now you can start:
echo 1. Backend: cd backend ^&^& npm run dev
echo 2. Frontend: cd frontend/Web ^&^& npm start
echo.
pause
