@echo off
set "PATH=C:\Python314;C:\Python314\Scripts;C:\Program Files\nodejs;%PATH%"
cd /d c:\Users\goluv\OneDrive\Desktop\work\INDUNEX-1\backend
C:\Python314\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
