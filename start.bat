@echo off
setlocal
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-services.ps1"
