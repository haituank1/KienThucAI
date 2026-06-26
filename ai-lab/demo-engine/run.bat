@echo off
setlocal

echo ============================================
echo   AI Lab - DemoEngine
echo ============================================
echo.

:: Check dotnet
where dotnet >nul 2>&1
if errorlevel 1 (
    echo [ERROR] .NET SDK chua duoc cai dat.
    echo Download tai: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [OK] .NET SDK:
dotnet --version
echo.

cd "%~dp0src\DemoEngine.API"

:: Clean build artifacts truoc de dam bao compile lai hoan toan
echo [1/3] Cleaning old build...
if exist bin rmdir /s /q bin
if exist obj rmdir /s /q obj
echo [OK] Cleaned.
echo.

:: Build
echo [2/3] Building DemoEngine...
dotnet build --nologo
if errorlevel 1 (
    echo.
    echo [FAILED] Build that bai. Xem loi phia tren.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting server...
echo ============================================
echo   Mo browser tai: http://localhost:5001
echo ============================================
echo.

dotnet run --no-build

pause
