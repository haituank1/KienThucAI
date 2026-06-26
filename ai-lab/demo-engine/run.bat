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

echo [OK] .NET SDK found:
dotnet --version
echo.

:: Build first
echo [1/2] Building DemoEngine...
cd "%~dp0src\DemoEngine.API"
dotnet build --nologo -v quiet
if errorlevel 1 (
    echo.
    echo [FAILED] Build that bai. Xem loi phia tren.
    pause
    exit /b 1
)

echo [OK] Build thanh cong.
echo.
echo [2/2] Starting server...
echo ============================================
echo   Mo browser tai: http://localhost:5001
echo ============================================
echo.

dotnet run --no-build

pause
