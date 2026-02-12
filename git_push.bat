@echo off
git init
git add .
git commit -m "Initial commit with Security Upgrade and WebRTC"
git branch -M main
git remote add origin https://github.com/biloldinn/TURON_TEST.git
git push -u origin main
pause
