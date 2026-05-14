@echo off
TITLE CivicSense Launcher
echo ==========================================
echo       MENYALAKAN CIVICSENSE AI
echo ==========================================
echo.

:: 1. Bersihkan port 3001 jika masih menyangkut
echo [1/3] Menyiapkan jalur khusus (Port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: 2. Jalankan Backend
echo [2/3] Menjalankan Backend (Server)...
start "CivicSense BACKEND (Port 3001)" cmd /k "cd server && node server.js"

:: 3. Jalankan Frontend
echo [3/3] Menjalankan Frontend (Vite)...
start "CivicSense FRONTEND (Port 5173)" cmd /k "cd client && npm run dev"

echo.
echo ------------------------------------------
echo BERHASIL! 
echo 1. Tunggu 5 detik sampai kedua terminal siap.
echo 2. Buka browser: http://localhost:5173
echo 3. Jangan tutup jendela hitam yang baru terbuka.
echo ------------------------------------------
echo.
pause
