@echo off
REM Swap runtime config for dev or prod.
REM Usage:
REM   swap-config.cmd dev   -> sets public\config.json to localhost config
REM   swap-config.cmd prod  -> sets public\config.json to production config

setlocal ENABLEDELAYEDEXPANSION

IF "%1"=="" (
  echo Usage: swap-config.cmd [dev|prod]
  exit /b 1
)

set TARGET=%1
set PUBDIR=%~dp0public

IF /I "%TARGET%"=="dev" (
  copy /Y "%PUBDIR%\config.json" "%PUBDIR%\config.json" >NUL
  echo Swapped to DEV: public\config.json remains localhost values.
  exit /b 0
)

IF /I "%TARGET%"=="prod" (
  copy /Y "%PUBDIR%\config.prod.json" "%PUBDIR%\config.json" || (
    echo Failed to copy config.prod.json to config.json
    exit /b 1
  )
  echo Swapped to PROD: public\config.json now points to production domain.
  exit /b 0
)

echo Unknown target: %TARGET%
echo Use dev or prod
exit /b 1