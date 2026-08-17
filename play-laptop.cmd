@echo off
REM Harbour + public laptop URL (Cloudflare tunnel).
cd /d "%~dp0game"
if not exist node_modules call npm install
call npm run play:laptop
