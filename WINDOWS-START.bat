@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js 22 first: https://nodejs.org/ & pause & exit /b 1)
if not exist .env (echo Copy .env.example to .env and configure Supabase public credentials. & pause & exit /b 1)
call npm install
if errorlevel 1 (echo npm install failed. & pause & exit /b 1)
call npm run dev
pause
