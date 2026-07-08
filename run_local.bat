@echo off
setlocal
where node >nul 2>nul || (
  echo [LOI] Chua cai Node.js 20.19 tro len.
  echo Tai tai https://nodejs.org/
  pause
  exit /b 1
)
if not exist .env.local (
  copy .env.example .env.local >nul
  echo [THONG BAO] Da tao .env.local. Hay dien thong tin Supabase truoc khi dang nhap.
)
if not exist node_modules (
  echo [1/2] Dang cai thu vien...
  call npm install || goto :error
)
echo [2/2] Khoi dong Vite...
call npm run dev
exit /b %errorlevel%
:error
echo [LOI] Khong the khoi dong du an.
pause
exit /b 1
