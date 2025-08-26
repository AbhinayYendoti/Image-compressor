@echo off
echo ========================================
echo    Image Compressor - Deploy Script
echo ========================================
echo.

echo [1/4] Checking Git status...
git status --porcelain
if %errorlevel% neq 0 (
    echo Error: Git not initialized or not in a repository
    pause
    exit /b 1
)

echo.
echo [2/4] Building project...
npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed
    pause
    exit /b 1
)

echo.
echo [3/4] Adding all changes to Git...
git add .
git commit -m "Auto-deploy: Update image compressor app"
if %errorlevel% neq 0 (
    echo Error: Git commit failed
    pause
    exit /b 1
)

echo.
echo [4/4] Pushing to GitHub...
echo Please enter your GitHub username:
set /p github_username=
git remote add origin https://github.com/%github_username%/image-compressor.git 2>nul
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    SUCCESS! Your code is on GitHub!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Go to https://vercel.com
    echo 2. Sign up with GitHub
    echo 3. Import your repository
    echo 4. Deploy!
    echo.
    echo Your app will be live in 2-3 minutes!
) else (
    echo.
    echo Error: Failed to push to GitHub
    echo Please check your GitHub repository URL
)

echo.
pause
