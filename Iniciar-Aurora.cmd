@echo off
cd /d "%~dp0"
echo Aurora Workspace - demonstracao local
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 24 ou superior para iniciar.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run build
if errorlevel 1 exit /b 1
echo Abra http://127.0.0.1:3001 no navegador. Ctrl+C encerra o servidor.
call npm start
pause
