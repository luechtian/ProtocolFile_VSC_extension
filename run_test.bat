@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM CONFIGURATION SECTION - MODIFY THESE VARIABLES AS NEEDED
REM ============================================================================

REM === TEST PROTOCOL DATA FILE ===
set "TEST_PROTOCOL_DATA=TestProtocolData.json"

REM === ADDON DIRECTORY  ===
set "ADDON_DIR=C:\Gitlab\cs.massstar.basicsoftware.protocolfile"

REM === APPLICATION PATHS ===
set "SERVER_DIR=C:\Gitlab\cs.massstar.basicsoftware.comm\bin\Release\net9.0"
set "CLIENT_DIR=C:\Gitlab\cs.massstar.basicsoftware.gui\src\CS.MassStar.BasicSoftware.GUI\WpfApp\bin\Release\net9.0-windows"
set "SERVER_CONFIG_FILE=appsettings.json"
set "CLIENT_CONFIG_FILE=Chromsystems.MassStar.BasicSoftware.GUI.dll.config"
set "SERVER_EXECUTABLE=Chromsystems.MassStar.BasicSoftware.Backend.exe"
set "SERVER_EXECUTABLE_ALT=Chromsystems.MassStar.BasicSoftware.Backend.exe"
set "CLIENT_EXECUTABLE=Chromsystems.MassStar.BasicSoftware.GUI.exe"
set "CLIENT_EXECUTABLE_ALT=Chromsystems.MassStar.BasicSoftware.GUI.exe"

REM === CONFIGURATION VALUES FOR JSON and XML ===
set "SIMULATION_PROTOCOL_PREFIX=--runningmode Hamilton --simudata"
set "CLIENT_SIMULATION_MODE_KEY=IsHamiltonSimulation"
set "CLIENT_SIMULATION_MODE_VALUE=true"
set "BACKUP_SUFFIX=.backup"

REM === OPTIONAL FEATURES ===
set "ENABLE_DATABASE_OPERATIONS=true"

set "BARCODE_REGEX=[A-Za-z0-9_]{1,100}"

set "DB_CARRIER_INPUT=mfxcarrieritems.json"

REM === CHECK FOR COMMAND LINE ARGUMENTS ===
if not "%~1"=="" goto parse_args

REM ============================================================================
REM MAIN SCRIPT EXECUTION
REM ============================================================================

:main_script
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

for %%f in ("%TEST_SCENARIO_DIR%%TEST_PROTOCOL_DATA%") do (
    set "PROTOCOL_FILE=%%~nxf"
    set "JSON_FILES_FOUND=YES"
    echo   Found: %%~nxf
)

if not defined JSON_FILES_FOUND (
    echo ERROR: No JSON file found in this test scenario!
    pause
    exit /b 1
)

if not exist %TEST_PROTOCOL_DATA% (
    echo ERROR: No JSON file found in this test scenario!
    pause
    exit /b 1
)

set "ABSOLUTE_PROTOCOL_PATH=%TEST_SCENARIO_DIR%%PROTOCOL_FILE%"
echo   Using Protocol file: %PROTOCOL_FILE%
echo.

echo.
echo [INFO] === CURRENT CONFIGURATION ===
echo Server Directory    : %SERVER_DIR%
echo Client Directory    : %CLIENT_DIR%
echo Server Config File  : %SERVER_CONFIG_FILE%
echo Client Config File  : %CLIENT_CONFIG_FILE%
echo Server Executable   : %SERVER_EXECUTABLE%
echo Client Executable   : %CLIENT_EXECUTABLE%
echo AddOn Directory     : %ADDON_DIR%
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

powershell -Command "try { $config = Get-Content '%SERVER_CONFIG%' | ConvertFrom-Json; $config.MassStarControllerSettings.SimulationRunnerParameters = '%SIMULATION_PROTOCOL_VALUE%'; $config | ConvertTo-Json -Depth 10 | Set-Content '%SERVER_CONFIG%'; Write-Host 'SUCCESS: Server configured' } catch { Write-Host 'ERROR: ' + $_.Exception.Message; exit 1 }"

powershell -Command "try { $config = Get-Content '%SERVER_CONFIG%' | ConvertFrom-Json; $config.AddOnDirectory = '%ADDON_DIR%'; $config | ConvertTo-Json -Depth 10 | Set-Content '%SERVER_CONFIG%'; Write-Host 'SUCCESS: Server configured' } catch { Write-Host 'ERROR: ' + $_.Exception.Message; exit 1 }"

if !errorlevel! neq 0 (
    echo ERROR: Server configuration failed
    goto :restore_and_exit
)

echo   SimulationRunnerParameters: %SIMULATION_PROTOCOL_VALUE%
echo   AddOnDirectory: %ADDON_DIR%
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
echo   Server (JSON): SimulationRunnerParameters configured
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
SQLCMD -Q "DROP DATABASE LabStudioDb"

\\22-DNS-FS.chromsystems.de\Data\2201_Basic_Software_MassSTAR\Tools\DatabaseUtility\CS.MassStar.BasicSoftware.DatabaseUtility.exe --labware-input "%DB_CARRIER_INPUT%"

SQLCMD -Q "UPDATE[LabStudioDb].[dbo].[SampleTubeType] SET BarcodeRegex = '%BARCODE_REGEX%' WHERE Id = 'D1A541D7-EBC3-4C33-A8C4-94DC54D4F222'"

REM echo   Database setup placeholder - add your commands in :DatabaseSetup
goto :eof

:DatabaseCleanup
REM Add your database cleanup commands here  
echo   Database cleanup placeholder - add your commands in :DatabaseCleanup
goto :eof

REM ============================================================================
REM COMMAND LINE PARAMETER PROCESSING
REM Usage: run_test.bat [--server-dir path] [--client-dir path] [--addon-dir path] [--config file]
REM ============================================================================

:parse_args
if "%~1"=="" goto main_script
if "%~1"=="--server-dir" (
    set "SERVER_DIR=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--client-dir" (
    set "CLIENT_DIR=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--addon-dir" (
    set "ADDON_DIRECTORY=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--test-data" (
    set "TEST_PROTOCOL_DATA=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--dbitems-dir" (
    set "DB_CARRIER_INPUT=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--server-exe" (
    set "SERVER_EXECUTABLE=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--client-exe" (
    set "CLIENT_EXECUTABLE=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--help" (
    goto show_help
)
REM Unknown parameter - skip it
shift
goto parse_args

REM ============================================================================
REM HELP DISPLAY
REM ============================================================================

:show_help
echo.
echo USAGE: run_test.bat [OPTIONS]
echo.
echo OPTIONS:
echo   --server-dir PATH     Set server directory path
echo   --client-dir PATH     Set client directory path  
echo   --addon-dir PATH      Set AddOnDirectory path for appsettings.json
echo   --dbitems-dir PATH    Set db items json path for DatabaseUtility.exe (mfxcarrieritems.json)
echo   --server-exe FILE     Set server executable name
echo   --client-exe FILE     Set client executable name
echo   --test-data FILE      Set TestProtocolData file name
echo   --help                Show this help message
echo.
echo EXAMPLES:
echo   ./run_test.bat --addon-dir "C:\Gitlab\cs.massstar.basicsoftware.protocolfile"
echo   ./run_test.bat --test-data "TestProtocolData.json"
echo   ./run_test.bat --test-data "TestProtocolData.json" --dbitems-dir "mfxcarrieritems.json"
echo   ./run_test.bat --server-dir "..\..\custom_server" --addon-dir "D:\AddOns"
echo.
goto end

REM ============================================================================
REM END
REM ============================================================================
:end
pause
exit /b 0
