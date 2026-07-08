@echo off
setlocal
where node >nul 2>nul || (
  echo [LOI] Chua cai Node.js 20.19 tro len.
  pause
  exit /b 1
)
echo [1/4] Cai dependency...
call npm install || goto :error
echo [2/4] Chay unit test...
call npm test || goto :error
echo [3/4] Kiem tra TypeScript...
call npm run typecheck || goto :error
echo [4/4] Build production...
call npm run build || goto :error
echo [THANH CONG] Ban build nam trong thu muc dist.
pause
exit /b 0
:error
echo [LOI] Build that bai. Xem dong loi phia tren.
pause
exit /b 1
