@echo off
set "PATH=C:\Python314;C:\Python314\Scripts;C:\Program Files\nodejs;%PATH%"

echo ========================================================
echo Starting INDUNEX Industrial AI Platform...
echo ========================================================

start "INDUNEX Backend (Port 8000)" cmd /k "cd /d c:\Users\goluv\OneDrive\Desktop\work\INDUNEX-1\backend && C:\Python314\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

start "INDUNEX Frontend (Port 5173)" cmd /k "cd /d c:\Users\goluv\OneDrive\Desktop\work\INDUNEX-1\frontend && npm run dev"

echo Backend URL:  http://localhost:8000
echo Frontend URL: http://localhost:5173
echo.
echo Both servers launched in separate windows!
