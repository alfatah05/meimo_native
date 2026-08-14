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

REM Kurangi noise CRLF di Windows + hindari auto-gc yang sering kunci file pack
git config core.autocrlf true >nul 2>&1
git config gc.auto 0 >nul 2>&1

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
  git branch -M main
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
git -c gc.auto=0 commit -m "%MSG%"
set COMMIT_ERR=%errorlevel%
if not %COMMIT_ERR%==0 (
  echo.
  echo Commit gagal atau tidak ada perubahan baru.
  echo.
  echo Jika muncul "Unlink of file ... failed":
  echo   1. Tutup VS Code / Cursor / File Explorer di folder .git
  echo   2. Pause antivirus sebentar untuk folder project
  echo   3. Pastikan folder TIDAK di-sync OneDrive/Google Drive
  echo   4. Jawab "y" kalau Git tanya try again, atau jalankan lagi push.bat
  echo.
  set /p CONT="Tetap lanjut push? (y/n): "
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

git -c gc.auto=0 push -u origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo [ERROR] Push gagal.
  echo   - Cek login GitHub (Personal Access Token, bukan password biasa)
  echo   - Atau: gh auth login
  echo   - Kalau "Unlink ... failed": tutup program yang buka folder project, jawab y, coba lagi
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Selesai. Branch: %BRANCH%
echo ========================================
pause
endlocal
