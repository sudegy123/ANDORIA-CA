@echo off
title Andoria - Local Servers
cd /d "%~dp0"
echo Website : http://localhost:3000
echo App     : http://localhost:3001
echo System  : http://localhost:3002
start "Andoria Website" cmd /k "npx --yes serve -l 3000 website"
start "Andoria App"     cmd /k "npx --yes serve -l 3001 app"
start "Andoria System"  cmd /k "npx --yes serve -l 3002 system"
ping -n 5 127.0.0.1 >nul
start http://localhost:3000
