@echo off
REM Two Harbors on this Windows machine. PAPER / SIMULATED.
cd /d "%~dp0game"
if not exist node_modules call npm install
echo Starting harbour on http://localhost:8787/
start "" http://localhost:8787/
call npm run play
