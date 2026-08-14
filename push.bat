@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   Meimo - Git push
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git tidak ditemukan. Install Git lalu coba lagi.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [INFO] Belum ada repo git di folder ini.
  set /p INIT="Inisialisasi git sekarang? (y/n): "
  if /i not "%INIT%"=="y" (
    echo Dibatalkan.
    pause
    exit /b 1
  )
  git init
  echo.
  set /p REMOTE="URL remote GitHub (contoh https://github.com/user/meimo.git): "
  if not "%REMOTE%"=="" (
    git remote add origin "%REMOTE%"
  )
)

echo Status:
git status -sb
echo.

set /p MSG="Pesan commit: "
if "%MSG%"=="" (
  echo [ERROR] Pesan commit tidak boleh kosong.
  pause
  exit /b 1
)

echo.
echo [1/3] git add ...
git add -A
if errorlevel 1 (
  echo [ERROR] git add gagal.
  pause
  exit /b 1
)

echo [2/3] git commit ...
git commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo Tidak ada perubahan untuk di-commit, atau commit gagal.
  echo Tetap lanjut push? 
  set /p CONT="(y/n): "
  if /i not "%CONT%"=="y" (
    echo Dibatalkan.
    pause
    exit /b 0
  )
)

echo [3/3] git push ...
for /f "delims=" %%b in ('git branch --show-current 2^>nul') do set BRANCH=%%b
if "%BRANCH%"=="" set BRANCH=main

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Remote "origin" belum di-set.
  set /p REMOTE="URL remote GitHub: "
  if "%REMOTE%"=="" (
    echo Dibatalkan.
    pause
    exit /b 1
  )
  git remote add origin "%REMOTE%"
)

git push -u origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo [ERROR] Push gagal. Cek koneksi / login GitHub (credential / token).
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Selesai. Branch: %BRANCH%
echo ========================================
pause
endlocal
