@echo off
if exist .git rmdir /s /q .git
git init
git add .
git commit -m "Final V2 Release: Security, WebRTC, and AI"
git branch -M main
git remote add origin https://github.com/biloldinn/TURON_TEST.git
git push -u origin main --force
pause
