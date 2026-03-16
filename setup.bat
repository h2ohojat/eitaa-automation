@echo off
rem Setup script for Eitaa Auto Forward (Windows)

rem 1) Check Node.js version
node -v >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo Node.js not found! Please install Node.js v20+ and rerun.
  pause
  exit /b 1
)

rem 2) Install dependencies
npm install
if %ERRORLEVEL% neq 0 (
  echo npm install failed! Check the output above.
  pause
  exit /b 1
)

rem 3) Install Playwright browser (chromium)
npx playwright install chromium
if %ERRORLEVEL% neq 0 (
  echo playwright install failed! Check the output above.
  pause
  exit /b 1
)

rem 4) Create required folders
if not exist logs mkdir logs
if not exist eitaa-session mkdir eitaa-session

rem 5) Copy config and admin defaults if missing
if not exist config.json (
  copy /Y config.example.json config.json >nul
)

if not exist admins.txt (
  copy /Y admins.example.txt admins.txt >nul
)

echo Setup completed successfully!
pause