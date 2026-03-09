@echo off
chcp 65001 >nul
title ClevrEdge Lock Manager

:: ============================================================
::  EDIT HERE: ใส่บัญชีทั้งหมดของคุณ (label=account_number)
:: ============================================================
set "ACC1=A1=260076407"
set "ACC2=A2=260076408"
set "ACC3=A3=260076409"
set "ACC4=A4=260076410"
set "ACC5=B1=260076411"
set "ACC6=B2=260076412"
set "ACC7=C1=260076413"
set "ACC8=C2=260076414"
set "ACC_COUNT=8"
:: ============================================================

:: MT4 Common Files path
set "LOCKDIR=%APPDATA%\MetaQuotes\Terminal\Common\Files"
set "LOCKFILE=%LOCKDIR%\clevredge_locked.txt"

if not exist "%LOCKDIR%" mkdir "%LOCKDIR%"
if not exist "%LOCKFILE%" type nul > "%LOCKFILE%"

:MENU
cls
echo  =============================================
echo   ClevrEdge Lock Manager
echo  =============================================
echo.

:: Show all accounts with lock status
echo   #   Label   Account       Status
echo   --- ------- ------------- --------
for /L %%i in (1,1,%ACC_COUNT%) do call :SHOW_ACC %%i
echo.
echo   [L] Lock account       [U] Unlock account
echo   [A] Unlock ALL         [X] Exit
echo.
set /p "CHOICE=  Choose: "

if /i "%CHOICE%"=="L" goto LOCK
if /i "%CHOICE%"=="U" goto UNLOCK
if /i "%CHOICE%"=="A" goto UNLOCKALL
if /i "%CHOICE%"=="X" exit
goto MENU

:SHOW_ACC
setlocal
call set "PAIR=%%ACC%1%%"
for /f "tokens=1,2 delims==" %%a in ("%PAIR%") do (
    set "LBL=%%a"
    set "NUM=%%b"
)
findstr /x "%NUM%" "%LOCKFILE%" >nul 2>&1
if %errorlevel%==0 (
    echo   %1   %LBL%     %NUM%      LOCKED
) else (
    echo   %1   %LBL%     %NUM%      -
)
endlocal
goto :eof

:LOCK
echo.
echo   Select account to LOCK:
for /L %%i in (1,1,%ACC_COUNT%) do call :LIST_ACC %%i
echo.
set /p "SEL=  Enter number (1-%ACC_COUNT%): "
if "%SEL%"=="" goto MENU
call set "PAIR=%%ACC%SEL%%%"
if "%PAIR%"=="" (echo   Invalid & pause & goto MENU)
for /f "tokens=1,2 delims==" %%a in ("%PAIR%") do (
    set "LBL=%%a"
    set "ACCT=%%b"
)
findstr /x "%ACCT%" "%LOCKFILE%" >nul 2>&1
if %errorlevel%==0 (
    echo.
    echo   Already locked: %LBL% ^(%ACCT%^)
    pause
    goto MENU
)
echo %ACCT%>> "%LOCKFILE%"
echo.
echo   LOCKED: %LBL% ^(%ACCT%^)
pause
goto MENU

:UNLOCK
echo.
echo   Select account to UNLOCK:
for /L %%i in (1,1,%ACC_COUNT%) do call :LIST_ACC %%i
echo.
set /p "SEL=  Enter number (1-%ACC_COUNT%): "
if "%SEL%"=="" goto MENU
call set "PAIR=%%ACC%SEL%%%"
if "%PAIR%"=="" (echo   Invalid & pause & goto MENU)
for /f "tokens=1,2 delims==" %%a in ("%PAIR%") do (
    set "LBL=%%a"
    set "ACCT=%%b"
)
set "TMPFILE=%LOCKFILE%.tmp"
type nul > "%TMPFILE%"
set "REMOVED=0"
for /f "usebackq delims=" %%a in ("%LOCKFILE%") do (
    if "%%a"=="%ACCT%" (
        set "REMOVED=1"
    ) else (
        if not "%%a"=="" echo %%a>> "%TMPFILE%"
    )
)
move /y "%TMPFILE%" "%LOCKFILE%" >nul
if "%REMOVED%"=="1" (
    echo.
    echo   UNLOCKED: %LBL% ^(%ACCT%^)
) else (
    echo.
    echo   Not locked: %LBL% ^(%ACCT%^)
)
pause
goto MENU

:LIST_ACC
setlocal
call set "PAIR=%%ACC%1%%"
for /f "tokens=1,2 delims==" %%a in ("%PAIR%") do echo     [%1] %%a  ^(%%b^)
endlocal
goto :eof

:UNLOCKALL
echo.
set /p "CONFIRM=  Unlock ALL accounts? (y/n): "
if /i not "%CONFIRM%"=="y" goto MENU
type nul > "%LOCKFILE%"
echo.
echo   All accounts UNLOCKED
pause
goto MENU
