@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM CONFIGURATION SECTION - MODIFY THESE VARIABLES AS NEEDED
REM ============================================================================

REM === APPLICATION PATHS ===
set "SERVER_DIR=..\..\software.comm"
set "CLIENT_DIR=..\..\software.gui"
set "SERVER_CONFIG_FILE=appsettings.json"
set "CLIENT_CONFIG_FILE=app.config"
set "SERVER_EXECUTABLE=software.comm.exe.bat"
set "SERVER_EXECUTABLE_ALT=software.comm.exe"
set "CLIENT_EXECUTABLE=software.gui.exe.bat"
set "CLIENT_EXECUTABLE_ALT=software.gui.exe"

REM === CONFIGURATION VALUES FOR JSON and XML ===
set "SIMULATION_PROTOCOL_PREFIX=--SimulationMode true"
set "CLIENT_SIMULATION_MODE_KEY=SimulationMode"
set "CLIENT_SIMULATION_MODE_VALUE=true"
set "BACKUP_SUFFIX=.backup"

REM === OPTIONAL FEATURES ===
set "ENABLE_DATABASE_OPERATIONS=false"

REM ============================================================================
REM MAIN SCRIPT EXECUTION
REM ============================================================================

echo ========================================
echo        TEST SCENARIO AUTOMATION
echo ========================================
echo.

REM Determine current test scenario directory and name
set "TEST_SCENARIO_DIR=%~dp0"
set "TEST_SCENARIO_NAME="

for %%i in ("%TEST_SCENARIO_DIR%.") do set "TEST_SCENARIO_NAME=%%~ni"

echo Test Scenario: %TEST_SCENARIO_NAME%
echo Directory: %TEST_SCENARIO_DIR%
echo Config Types: Server JSON, Client XML
echo.

REM ============================================================================
REM STEP 1: FIND TESTPROTOCOL JSON FILE
REM ============================================================================
echo [Step 1] Searching for TestProtocol JSON file...

set "PROTOCOL_FILE="
set "JSON_FILES_FOUND="

for %%f in ("%TEST_SCENARIO_DIR%*.json") do (
    set "PROTOCOL_FILE=%%~nxf"
    set "JSON_FILES_FOUND=YES"
    echo   Found: %%~nxf
)

if not defined JSON_FILES_FOUND (
    echo ERROR: No JSON file found in this test scenario!
    pause
    exit /b 1
)

set "ABSOLUTE_PROTOCOL_PATH=%TEST_SCENARIO_DIR%%PROTOCOL_FILE%"
echo   Using Protocol file: %PROTOCOL_FILE%
echo.

REM ============================================================================
REM STEP 2: DATABASE SETUP (IF ENABLED)
REM ============================================================================
if "%ENABLE_DATABASE_OPERATIONS%"=="true" (
    echo [Step 2] Database setup...
    call :DatabaseSetup
    echo.
) else (
    echo [Step 2] Database operations disabled - skipping
    echo.
)

REM ============================================================================
REM STEP 3: BACKUP CONFIGURATIONS
REM ============================================================================
echo [Step 3] Creating configuration backups...

set "SERVER_CONFIG=%SERVER_DIR%\%SERVER_CONFIG_FILE%"
set "CLIENT_CONFIG=%CLIENT_DIR%\%CLIENT_CONFIG_FILE%"
set "SERVER_BACKUP=%SERVER_DIR%\%SERVER_CONFIG_FILE%%BACKUP_SUFFIX%"
set "CLIENT_BACKUP=%CLIENT_DIR%\%CLIENT_CONFIG_FILE%%BACKUP_SUFFIX%"

if not exist "%SERVER_CONFIG%" (
    echo ERROR: Server configuration not found: %SERVER_CONFIG%
    pause
    exit /b 1
)

if not exist "%CLIENT_CONFIG%" (
    echo ERROR: Client configuration not found: %CLIENT_CONFIG%
    pause
    exit /b 1
)

copy "%SERVER_CONFIG%" "%SERVER_BACKUP%" >nul
copy "%CLIENT_CONFIG%" "%CLIENT_BACKUP%" >nul

echo   SUCCESS: Configuration files backed up
echo.

REM ============================================================================
REM STEP 4: CONFIGURE SERVER (JSON)
REM ============================================================================
echo [Step 4] Configuring server (JSON format)...

set "SIMULATION_PROTOCOL_VALUE=%SIMULATION_PROTOCOL_PREFIX% %ABSOLUTE_PROTOCOL_PATH%"

powershell -Command "try { $config = Get-Content '%SERVER_CONFIG%' | ConvertFrom-Json; $config.SimulationProtocol = '%SIMULATION_PROTOCOL_VALUE%'; $config | ConvertTo-Json -Depth 10 | Set-Content '%SERVER_CONFIG%'; Write-Host 'SUCCESS: Server configured' } catch { Write-Host 'ERROR: ' + $_.Exception.Message; exit 1 }"

if !errorlevel! neq 0 (
    echo ERROR: Server configuration failed
    goto :restore_and_exit
)

echo   SimulationProtocol: %SIMULATION_PROTOCOL_VALUE%
echo.

REM ============================================================================
REM STEP 5: CONFIGURE CLIENT (XML app.config)
REM ============================================================================
echo [Step 5] Configuring client (XML app.config format)...

REM PowerShell command to update XML app.config file
powershell -Command "try { [xml]$config = Get-Content '%CLIENT_CONFIG%'; $appSettings = $config.configuration.appSettings; $simNode = $appSettings.add | Where-Object { $_.key -eq '%CLIENT_SIMULATION_MODE_KEY%' }; if ($simNode) { $simNode.value = '%CLIENT_SIMULATION_MODE_VALUE%' } else { $newNode = $config.CreateElement('add'); $newNode.SetAttribute('key', '%CLIENT_SIMULATION_MODE_KEY%'); $newNode.SetAttribute('value', '%CLIENT_SIMULATION_MODE_VALUE%'); $appSettings.AppendChild($newNode) | Out-Null }; $config.Save('%CLIENT_CONFIG%'); Write-Host 'SUCCESS: Client XML configured' } catch { Write-Host 'ERROR: ' + $_.Exception.Message; exit 1 }"

if !errorlevel! neq 0 (
    echo ERROR: Client XML configuration failed
    goto :restore_and_exit
)

echo   %CLIENT_SIMULATION_MODE_KEY%: %CLIENT_SIMULATION_MODE_VALUE%
echo.

REM ============================================================================
REM STEP 6: START APPLICATIONS
REM ============================================================================
echo [Step 6] Starting applications...

echo   - Starting server...
if exist "%SERVER_DIR%\%SERVER_EXECUTABLE%" (
    start "Server - %TEST_SCENARIO_NAME%" /D "%SERVER_DIR%" "%SERVER_EXECUTABLE%"
) else if exist "%SERVER_DIR%\%SERVER_EXECUTABLE_ALT%" (
    start "Server - %TEST_SCENARIO_NAME%" /D "%SERVER_DIR%" "%SERVER_EXECUTABLE_ALT%"
) else (
    echo ERROR: No server executable found
    goto :restore_and_exit
)

echo   - Waiting 5 seconds for server startup...
timeout /t 5 /nobreak >nul

echo   - Starting client...
if exist "%CLIENT_DIR%\%CLIENT_EXECUTABLE%" (
    start "Client - %TEST_SCENARIO_NAME%" /D "%CLIENT_DIR%" "%CLIENT_EXECUTABLE%"
) else if exist "%CLIENT_DIR%\%CLIENT_EXECUTABLE_ALT%" (
    start "Client - %TEST_SCENARIO_NAME%" /D "%CLIENT_DIR%" "%CLIENT_EXECUTABLE_ALT%"
) else (
    echo ERROR: No client executable found
    goto :restore_and_exit
)

echo.

REM ============================================================================
REM TEST SCENARIO ACTIVE
REM ============================================================================
echo ========================================
echo    TEST SCENARIO ACTIVE
echo ========================================
echo.
echo SUCCESS: Test scenario "%TEST_SCENARIO_NAME%" is running
echo.
echo Configuration:
echo   Protocol file: %PROTOCOL_FILE%
echo   Server (JSON): SimulationProtocol configured
echo   Client (XML): %CLIENT_SIMULATION_MODE_KEY% = %CLIENT_SIMULATION_MODE_VALUE%
echo.
echo Applications are running in separate windows.
echo Close them before pressing a key to restore configurations.
echo.
pause

REM ============================================================================
REM CLEANUP AND RESTORE
REM ============================================================================
echo.
echo [Cleanup] Restoring original configurations...

if "%ENABLE_DATABASE_OPERATIONS%"=="true" (
    call :DatabaseCleanup
)

if exist "%SERVER_BACKUP%" (
    copy "%SERVER_BACKUP%" "%SERVER_CONFIG%" >nul
    del "%SERVER_BACKUP%" >nul
    echo   Server configuration restored
)

if exist "%CLIENT_BACKUP%" (
    copy "%CLIENT_BACKUP%" "%CLIENT_CONFIG%" >nul
    del "%CLIENT_BACKUP%" >nul
    echo   Client XML configuration restored
)

echo.
echo Test scenario completed. System ready for next test.
goto :end

REM ============================================================================
REM ERROR HANDLING
REM ============================================================================
:restore_and_exit
echo.
echo Error occurred. Restoring configurations...

if "%ENABLE_DATABASE_OPERATIONS%"=="true" (
    call :DatabaseCleanup
)

if exist "%SERVER_BACKUP%" (
    copy "%SERVER_BACKUP%" "%SERVER_CONFIG%" >nul
    del "%SERVER_BACKUP%" >nul
)

if exist "%CLIENT_BACKUP%" (
    copy "%CLIENT_BACKUP%" "%CLIENT_CONFIG%" >nul
    del "%CLIENT_BACKUP%" >nul
)

pause
exit /b 1

REM ============================================================================
REM DATABASE FUNCTIONS - ADD YOUR COMMANDS HERE IF NEEDED
REM ============================================================================

:DatabaseSetup
REM Add your database setup commands here
echo   Database setup placeholder - add your commands in :DatabaseSetup
goto :eof

:DatabaseCleanup
REM Add your database cleanup commands here  
echo   Database cleanup placeholder - add your commands in :DatabaseCleanup
goto :eof

REM ============================================================================
REM END
REM ============================================================================
:end
pause
exit /b 0